import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '@/config/database.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { User, BranchUser } from '@vision-menu/types';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Get users for a specific branch
   */
  async findAllByBranch(branchId: string): Promise<BranchUser[]> {
    try {
      this.logger.log(`Getting users for branch: ${branchId}`);
      const supabase = this.databaseService.getAdminClient();

      // Get branch users first
      const { data: branchUsers, error } = await supabase
        .from('branch_users')
        .select('*')
        .eq('branch_id', branchId);

      if (error) {
        this.logger.error(`Database error: ${error.message}`, error);
        throw new BadRequestException(`Failed to get branch users: ${error.message}`);
      }

      this.logger.log(`Found ${branchUsers?.length || 0} branch users`);

      if (!branchUsers || branchUsers.length === 0) {
        return [];
      }

      // Get user profiles for all branch users
      const userIds = branchUsers.map(bu => bu.user_id);
      const { data: userProfiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, phone, avatar_url')
        .in('user_id', userIds);

      if (profilesError) {
        this.logger.warn(`Could not get user profiles: ${profilesError.message}`);
      }

      // Combine data
      return branchUsers.map(branchUser => {
        const profile = userProfiles?.find(p => p.user_id === branchUser.user_id);
        
        return {
          ...branchUser,
          user: {
            id: branchUser.user_id,
            email: 'test@example.com', // Temporary placeholder
            full_name: profile?.full_name || null,
            phone: profile?.phone || null,
            avatar_url: profile?.avatar_url || null,
          }
        };
      });
    } catch (error) {
      this.logger.error(`Error getting branch users: ${error.message}`, error.stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to get branch users');
    }
  }

  /**
   * Get a specific user
   */
  async findOne(userId: string, branchId: string): Promise<BranchUser> {
    try {
      const supabase = this.databaseService.getAdminClient();

      const { data: branchUser, error } = await supabase
        .from('branch_users')
        .select(`
          *,
          branch:branches(
            id,
            name,
            slug
          ),
          user:user_profiles(
            user_id,
            full_name,
            phone,
            avatar_url
          )
        `)
        .eq('user_id', userId)
        .eq('branch_id', branchId)
        .single();

      if (error || !branchUser) {
        throw new NotFoundException('User not found in this branch');
      }

      // Get auth user email
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      
      if (!authUser?.user) {
        throw new NotFoundException('User not found in auth system');
      }

      return {
        ...branchUser,
        user: {
          id: branchUser.user_id,
          email: authUser.user.email || '',
          full_name: branchUser.user?.full_name,
          phone: branchUser.user?.phone,
          avatar_url: branchUser.user?.avatar_url,
        }
      };
    } catch (error) {
      this.logger.error(`Error getting user: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to get user');
    }
  }

  /**
   * Create a new user
   */
  async create(createUserDto: CreateUserDto, currentUserId: string): Promise<BranchUser> {
    try {
      const supabase = this.databaseService.getAdminClient();

      // Check if branch exists
      const { data: branch, error: branchError } = await supabase
        .from('branches')
        .select('id, chain_id')
        .eq('id', createUserDto.branch_id)
        .single();

      if (branchError || !branch) {
        throw new NotFoundException('Branch not found');
      }

      // Check if current user has permission to create users in this branch
      const { data: currentUserBranch, error: currentUserError } = await supabase
        .from('branch_users')
        .select('role')
        .eq('user_id', currentUserId)
        .eq('branch_id', createUserDto.branch_id)
        .single();

      if (currentUserError || !currentUserBranch) {
        throw new ForbiddenException('You do not have permission to create users in this branch');
      }

      if (
        currentUserBranch.role !== 'chain_owner' && 
        currentUserBranch.role !== 'branch_manager'
      ) {
        throw new ForbiddenException('Only chain owners and branch managers can create users');
      }

      // Create user in auth system
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: createUserDto.email,
        password: createUserDto.password,
        email_confirm: true,
        user_metadata: {
          full_name: createUserDto.full_name,
        },
      });

      if (authError || !authUser?.user) {
        throw new BadRequestException(`Failed to create user: ${authError?.message}`);
      }

      // Wait a moment for the trigger to create user profile
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update user profile with additional info (trigger only creates basic profile)
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          full_name: createUserDto.full_name,
          phone: createUserDto.phone,
        })
        .eq('user_id', authUser.user.id);

      if (profileError) {
        console.warn('Could not update user profile:', profileError.message);
        // Don't rollback - profile exists from trigger
      }

      // Associate user with branch
      const { data: branchUser, error: branchUserError } = await supabase
        .from('branch_users')
        .insert({
          user_id: authUser.user.id,
          branch_id: createUserDto.branch_id,
          role: createUserDto.role,
          permissions: createUserDto.permissions || [],
          is_active: true,
        })
        .select(`
          *,
          branch:branches(
            id,
            name,
            slug
          )
        `)
        .single();

      if (branchUserError) {
        // Rollback auth user and profile creation
        await supabase.auth.admin.deleteUser(authUser.user.id);
        throw new BadRequestException(`Failed to associate user with branch: ${branchUserError.message}`);
      }

      return {
        ...branchUser,
        user: {
          id: authUser.user.id,
          email: authUser.user.email || '',
          full_name: createUserDto.full_name,
          phone: createUserDto.phone,
        }
      };
    } catch (error) {
      this.logger.error(`Error creating user: ${error.message}`, error.stack);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to create user');
    }
  }

  /**
   * Update a user
   */
  async update(
    userId: string,
    branchId: string,
    updateUserDto: UpdateUserDto,
    currentUserId: string,
  ): Promise<BranchUser> {
    try {
      const supabase = this.databaseService.getAdminClient();

      // Check if user exists in this branch
      const { data: existingUser, error: existingUserError } = await supabase
        .from('branch_users')
        .select('*')
        .eq('user_id', userId)
        .eq('branch_id', branchId)
        .single();

      if (existingUserError || !existingUser) {
        throw new NotFoundException('User not found in this branch');
      }

      // Check permissions (users can update themselves, managers can update others)
      if (currentUserId !== userId) {
        const { data: currentUserBranch, error: currentUserError } = await supabase
          .from('branch_users')
          .select('role')
          .eq('user_id', currentUserId)
          .eq('branch_id', branchId)
          .single();

        if (currentUserError || !currentUserBranch) {
          throw new ForbiddenException('You do not have permission to update users in this branch');
        }

        if (
          currentUserBranch.role !== 'chain_owner' && 
          currentUserBranch.role !== 'branch_manager'
        ) {
          throw new ForbiddenException('Only chain owners and branch managers can update other users');
        }
      }

      // Update user profile
      if (updateUserDto.full_name || updateUserDto.phone || updateUserDto.avatar_url) {
        const profileUpdate: any = {};
        if (updateUserDto.full_name) profileUpdate.full_name = updateUserDto.full_name;
        if (updateUserDto.phone) profileUpdate.phone = updateUserDto.phone;
        if (updateUserDto.avatar_url) profileUpdate.avatar_url = updateUserDto.avatar_url;

        const { error: profileError } = await supabase
          .from('user_profiles')
          .update(profileUpdate)
          .eq('user_id', userId);

        if (profileError) {
          throw new BadRequestException(`Failed to update user profile: ${profileError.message}`);
        }
      }

      // Update auth user email if provided
      if (updateUserDto.email) {
        const { error: authError } = await supabase.auth.admin.updateUserById(
          userId,
          { email: updateUserDto.email }
        );

        if (authError) {
          throw new BadRequestException(`Failed to update user email: ${authError.message}`);
        }
      }

      // Update branch user if is_active is provided
      if (updateUserDto.is_active !== undefined) {
        const { error: branchUserError } = await supabase
          .from('branch_users')
          .update({ is_active: updateUserDto.is_active })
          .eq('user_id', userId)
          .eq('branch_id', branchId);

        if (branchUserError) {
          throw new BadRequestException(`Failed to update user status: ${branchUserError.message}`);
        }
      }

      // Return void - no need to fetch updated user
      return;
    } catch (error) {
      this.logger.error(`Error updating user: ${error.message}`, error.stack);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to update user');
    }
  }

  /**
   * Assign a role to a user
   */
  async assignRole(
    userId: string,
    branchId: string,
    assignRoleDto: AssignRoleDto,
    currentUserId: string,
  ): Promise<BranchUser> {
    try {
      const supabase = this.databaseService.getAdminClient();

      // Check if user exists in this branch
      const { data: existingUser, error: existingUserError } = await supabase
        .from('branch_users')
        .select('*')
        .eq('user_id', userId)
        .eq('branch_id', branchId)
        .single();

      if (existingUserError || !existingUser) {
        throw new NotFoundException('User not found in this branch');
      }

      // Check if current user has permission to assign roles
      const { data: currentUserBranch, error: currentUserError } = await supabase
        .from('branch_users')
        .select('role')
        .eq('user_id', currentUserId)
        .eq('branch_id', branchId)
        .single();

      if (currentUserError || !currentUserBranch) {
        throw new ForbiddenException('You do not have permission to assign roles in this branch');
      }

      if (
        currentUserBranch.role !== 'chain_owner' && 
        currentUserBranch.role !== 'branch_manager'
      ) {
        throw new ForbiddenException('Only chain owners and branch managers can assign roles');
      }

      // Prevent assigning chain_owner role unless current user is chain_owner
      if (
        assignRoleDto.role === 'chain_owner' && 
        currentUserBranch.role !== 'chain_owner'
      ) {
        throw new ForbiddenException('Only chain owners can assign the chain_owner role');
      }

      // Update user role
      const { error: updateError } = await supabase
        .from('branch_users')
        .update({
          role: assignRoleDto.role,
          permissions: assignRoleDto.permissions || existingUser.permissions,
        })
        .eq('user_id', userId)
        .eq('branch_id', branchId);

      if (updateError) {
        throw new BadRequestException(`Failed to update user role: ${updateError.message}`);
      }

      // Get updated user
      return this.findOne(userId, branchId);
    } catch (error) {
      this.logger.error(`Error assigning role: ${error.message}`, error.stack);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to assign role');
    }
  }

  /**
   * Remove a user from a branch (soft delete)
   */
  async remove(userId: string, branchId: string, currentUserId: string): Promise<void> {
    try {
      const supabase = this.databaseService.getAdminClient();

      // Check if user exists in this branch
      const { data: existingUser, error: existingUserError } = await supabase
        .from('branch_users')
        .select('*')
        .eq('user_id', userId)
        .eq('branch_id', branchId)
        .single();

      if (existingUserError || !existingUser) {
        throw new NotFoundException('User not found in this branch');
      }

      // Check if current user has permission to remove users
      const { data: currentUserBranch, error: currentUserError } = await supabase
        .from('branch_users')
        .select('role')
        .eq('user_id', currentUserId)
        .eq('branch_id', branchId)
        .single();

      if (currentUserError || !currentUserBranch) {
        throw new ForbiddenException('You do not have permission to remove users from this branch');
      }

      if (
        currentUserBranch.role !== 'chain_owner' && 
        currentUserBranch.role !== 'branch_manager'
      ) {
        throw new ForbiddenException('Only chain owners and branch managers can remove users');
      }

      // Prevent removing yourself
      if (currentUserId === userId) {
        throw new ForbiddenException('You cannot remove yourself');
      }

      // Soft delete user from branch
      const { error: updateError } = await supabase
        .from('branch_users')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('branch_id', branchId);

      if (updateError) {
        throw new BadRequestException(`Failed to remove user: ${updateError.message}`);
      }
    } catch (error) {
      this.logger.error(`Error removing user: ${error.message}`, error.stack);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to remove user');
    }
  }
}