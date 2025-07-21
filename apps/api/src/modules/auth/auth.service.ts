import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcryptjs";
import { DatabaseService } from "@/config/database.service";
import {
  LoginResponse,
  RegisterResponse,
  User,
  AuthTokenPayload,
} from "../../types";
import {
  LoginDto,
  RegisterDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from "./dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {}

  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const { email, password, chain_slug, branch_slug } = loginDto;

    try {
      // Get admin client for server-side operations
      const supabase = this.databaseService.getAdminClient();

      // Get user by email
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

      if (userError || !user) {
        throw new UnauthorizedException("Invalid credentials");
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(
        password,
        user.password_hash,
      );
      if (!isPasswordValid) {
        throw new UnauthorizedException("Invalid credentials");
      }

      // Get user's branch association (multi-branch)
      let branchQuery = supabase
        .from("branch_users")
        .select(`
          *,
          branch:branches(
            id, name, slug,
            chain:restaurant_chains(id, name, slug)
          )
        `)
        .eq("user_id", user.id)
        .eq("is_active", true);

      // Filter by chain and/or branch slug if provided
      if (chain_slug) {
        branchQuery = branchQuery.eq("branch.chain.slug", chain_slug);
      }
      if (branch_slug) {
        branchQuery = branchQuery.eq("branch.slug", branch_slug);
      }

      const { data: branchUsers, error: branchError } = await branchQuery;

      if (branchError || !branchUsers?.length) {
        throw new UnauthorizedException(
          "User not associated with any branch",
        );
      }

      // If multiple branches, take the first one or the one matching the slug
      const branchUser = branchUsers[0];
      const branch = branchUser.branch;
      const chain = branch.chain;

      // Generate JWT token
      const payload: AuthTokenPayload = {
        sub: user.id,
        email: user.email,
        chain_id: chain.id,
        branch_id: branch.id,
        branch_name: branch.name,
        role: branchUser.role,
        permissions: branchUser.permissions,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
      };

      const access_token = this.jwtService.sign(payload);
      const refresh_token = this.jwtService.sign(
        { sub: user.id, type: "refresh" },
        { expiresIn: this.configService.get("jwt.refreshExpiresIn") },
      );

      // Update last login
      await supabase
        .from("users")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", user.id);

      return {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          phone: user.phone,
          avatar_url: user.avatar_url,
          is_active: user.is_active,
          email_verified: user.email_verified,
          phone_verified: user.phone_verified,
          last_login_at: user.last_login_at,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
        session: {
          user: {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            phone: user.phone,
            avatar_url: user.avatar_url,
            is_active: user.is_active,
            email_verified: user.email_verified,
            phone_verified: user.phone_verified,
            last_login_at: user.last_login_at,
            created_at: user.created_at,
            updated_at: user.updated_at,
          },
          chain_id: chain.id,
          branch_id: branch.id,
          branch_name: branch.name,
          role: branchUser.role,
          permissions: branchUser.permissions,
          access_token,
          refresh_token,
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
        chain: {
          id: chain.id,
          name: chain.name,
          slug: chain.slug,
        },
        branch: {
          id: branch.id,
          name: branch.name,
          slug: branch.slug,
        },
        // If chain_owner, show available branches
        available_branches: branchUser.role === 'chain_owner' 
          ? branchUsers.map(bu => ({
              id: bu.branch.id,
              name: bu.branch.name,
              slug: bu.branch.slug,
            }))
          : undefined,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException("Login failed");
    }
  }

  async register(registerDto: RegisterDto): Promise<RegisterResponse> {
    const {
      email,
      password,
      full_name,
      phone,
      chain_name,
      chain_slug,
      first_branch_name,
      first_branch_slug,
    } = registerDto;

    try {
      const supabase = this.databaseService.getAdminClient();

      // Check if user already exists in auth system
      const { data: existingAuthUser } = await supabase.auth.admin.listUsers();
      const userExists = existingAuthUser?.users?.some((u: any) => u.email === email);

      if (userExists) {
        throw new BadRequestException("User already exists");
      }

      // Check if chain slug is taken
      const { data: existingChain } = await supabase
        .from("restaurant_chains")
        .select("id")
        .eq("slug", chain_slug)
        .single();

      if (existingChain) {
        throw new BadRequestException("Chain slug is already taken");
      }

      // Create user in auth system
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name,
        },
      });

      if (authError || !authUser?.user) {
        console.error('Auth user creation error:', authError);
        throw new BadRequestException(`Failed to create user: ${authError?.message}`);
      }

      // Get user profile (created automatically by trigger)
      // Wait a bit for trigger to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const { data: user, error: profileError } = await supabase
        .from("user_profiles")
        .select()
        .eq("user_id", authUser.user.id)
        .single();

      if (profileError || !user) {
        console.error('Profile retrieval error:', profileError);
        // Rollback auth user creation
        await supabase.auth.admin.deleteUser(authUser.user.id);
        throw new BadRequestException(`Failed to retrieve user profile: ${profileError?.message}`);
      }

      // Update profile with additional info if needed
      if (phone) {
        const { error: updateError } = await supabase
          .from("user_profiles")
          .update({ phone })
          .eq("user_id", authUser.user.id);

        if (updateError) {
          console.error('Profile update error:', updateError);
        }
      }

      // Create restaurant chain
      const { data: chain, error: chainError } = await supabase
        .from("restaurant_chains")
        .insert({
          name: chain_name,
          slug: chain_slug,
          settings: {
            default_currency: "USD",
            default_tax_rate: 0.1,
            default_service_fee: 0.0,
            branding: {},
            features: {
              multi_branch_reporting: true,
              centralized_menu_management: false,
              cross_branch_transfers: false,
            },
          },
        })
        .select()
        .single();

      if (chainError) {
        console.error('Chain creation error:', chainError);
        throw new BadRequestException(`Failed to create restaurant chain: ${chainError.message}`);
      }

      // Create first branch
      const { data: branch, error: branchError } = await supabase
        .from("branches")
        .insert({
          chain_id: chain.id,
          name: first_branch_name,
          slug: first_branch_slug,
          settings: {
            currency: "USD",
            tax_rate: 0.1,
            service_fee: 0.0,
            min_order_amount: 0,
            max_delivery_distance: 10,
            delivery_fee: 2.99,
            pickup_enabled: true,
            delivery_enabled: true,
            table_service_enabled: true,
            qr_ordering_enabled: true,
            online_payments_enabled: true,
            third_party_integration_enabled: false,
          },
        })
        .select()
        .single();

      if (branchError) {
        console.error('Branch creation error:', branchError);
        throw new BadRequestException(`Failed to create branch: ${branchError.message}`);
      }

      // Associate user with branch as chain_owner
      const { error: associationError } = await supabase
        .from("branch_users")
        .insert({
          user_id: authUser.user.id,
          branch_id: branch.id,
          role: "chain_owner",
          permissions: ["*"],
        });

      if (associationError) {
        console.error('Association error:', associationError);
        throw new BadRequestException(
          `Failed to associate user with branch: ${associationError.message}`,
        );
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          phone: user.phone,
          avatar_url: user.avatar_url,
          is_active: user.is_active,
          email_verified: user.email_verified,
          phone_verified: user.phone_verified,
          last_login_at: user.last_login_at,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
        chain: {
          id: chain.id,
          name: chain.name,
          slug: chain.slug,
        },
        branch: {
          id: branch.id,
          name: branch.name,
          slug: branch.slug,
        },
        verification_required: true,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException("Registration failed");
    }
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    // Implementation for password reset email
    // This would typically send an email with reset link
    return { message: "Password reset email sent" };
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    // Implementation for password reset
    // This would verify the token and update the password
    return { message: "Password reset successfully" };
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const { current_password, new_password } = changePasswordDto;

    try {
      const supabase = this.databaseService.getAdminClient();

      // Get user
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("password_hash")
        .eq("id", userId)
        .single();

      if (userError || !user) {
        throw new BadRequestException("User not found");
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(
        current_password,
        user.password_hash,
      );
      if (!isPasswordValid) {
        throw new BadRequestException("Current password is incorrect");
      }

      // Hash new password
      const new_password_hash = await bcrypt.hash(new_password, 10);

      // Update password
      const { error: updateError } = await supabase
        .from("users")
        .update({ password_hash: new_password_hash })
        .eq("id", userId);

      if (updateError) {
        throw new BadRequestException("Failed to update password");
      }

      return { message: "Password changed successfully" };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException("Failed to change password");
    }
  }

  async getProfile(userId: string): Promise<User> {
    try {
      const supabase = this.databaseService.getAdminClient();

      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error || !user) {
        throw new BadRequestException("User not found");
      }

      return {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        avatar_url: user.avatar_url,
        is_active: user.is_active,
        email_verified: user.email_verified,
        phone_verified: user.phone_verified,
        last_login_at: user.last_login_at,
        created_at: user.created_at,
        updated_at: user.updated_at,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException("Failed to get profile");
    }
  }

  async logout(userId: string): Promise<{ message: string }> {
    // Implementation for logout
    // This could invalidate tokens or update last activity
    return { message: "Logged out successfully" };
  }

  async refreshToken(userId: string): Promise<{ access_token: string }> {
    try {
      const supabase = this.databaseService.getAdminClient();

      // Get user and branch association
      const { data: branchUser, error } = await supabase
        .from("branch_users")
        .select(`
          *,
          branch:branches(
            id, name, slug,
            chain:restaurant_chains(id, name, slug)
          )
        `)
        .eq("user_id", userId)
        .eq("is_active", true)
        .single();

      if (error || !branchUser) {
        throw new UnauthorizedException("User not found");
      }

      // Get user profile
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      // Generate new JWT token
      const payload: AuthTokenPayload = {
        sub: userId,
        email: profile?.full_name || '',
        chain_id: branchUser.branch.chain.id,
        branch_id: branchUser.branch.id,
        branch_name: branchUser.branch.name,
        role: branchUser.role,
        permissions: branchUser.permissions,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
      };

      const access_token = this.jwtService.sign(payload);

      return { access_token };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException("Failed to refresh token");
    }
  }

  async switchBranch(userId: string, branchId: string): Promise<{ access_token: string; branch: any }> {
    try {
      const supabase = this.databaseService.getAdminClient();

      // Get user's branch association for the requested branch
      const { data: branchUser, error } = await supabase
        .from("branch_users")
        .select(`
          *,
          branch:branches(
            id, name, slug,
            chain:restaurant_chains(id, name, slug)
          )
        `)
        .eq("user_id", userId)
        .eq("branch_id", branchId)
        .eq("is_active", true)
        .single();

      if (error || !branchUser) {
        throw new UnauthorizedException("User not associated with this branch");
      }

      // Get user profile for email
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      
      if (!authUser?.user) {
        throw new UnauthorizedException("User not found");
      }

      // Generate new JWT token for the new branch
      const payload: AuthTokenPayload = {
        sub: userId,
        email: authUser.user.email || '',
        chain_id: branchUser.branch.chain.id,
        branch_id: branchUser.branch.id,
        branch_name: branchUser.branch.name,
        role: branchUser.role,
        permissions: branchUser.permissions,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
      };

      const access_token = this.jwtService.sign(payload);

      return {
        access_token,
        branch: {
          id: branchUser.branch.id,
          name: branchUser.branch.name,
          slug: branchUser.branch.slug,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException("Failed to switch branch");
    }
  }
}
