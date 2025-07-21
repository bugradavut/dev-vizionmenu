import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, AssignRoleDto } from './dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { RequireRole } from '@/modules/auth/decorators/require-role.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@vision-menu/types';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) { }


  @Get('branch/:branchId')
  @ApiOperation({ summary: 'Get all users in a branch' })
  @ApiParam({ name: 'branchId', description: 'Branch ID' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @RequireRole('chain_owner', 'branch_manager', 'branch_staff')
  async findAllByBranch(
    @Param('branchId', ParseUUIDPipe) branchId: string,
  ) {
    const users = await this.usersService.findAllByBranch(branchId);
    
    return {
      data: {
        users: users,
        total: users.length,
        page: 1,
        limit: 50
      }
    };
  }

  @Get(':userId/branch/:branchId')
  @ApiOperation({ summary: 'Get a specific user in a branch' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'branchId', description: 'Branch ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @RequireRole('chain_owner', 'branch_manager', 'branch_staff')
  async findOne(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('branchId', ParseUUIDPipe) branchId: string,
  ) {
    return this.usersService.findOne(userId, branchId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @RequireRole('chain_owner', 'branch_manager')
  async create(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() user: User,
  ) {
    const newUser = await this.usersService.create(createUserDto, user.id);
    
    return {
      data: {
        user: newUser
      }
    };
  }

  @Patch(':userId/branch/:branchId')
  @ApiOperation({ summary: 'Update a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'branchId', description: 'Branch ID' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @RequireRole('chain_owner', 'branch_manager', 'branch_staff')
  async update(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: User,
  ) {
    await this.usersService.update(userId, branchId, updateUserDto, user.id);
    
    return {
      data: { success: true }
    };
  }

  @Post(':userId/branch/:branchId/assign-role')
  @ApiOperation({ summary: 'Assign a role to a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'branchId', description: 'Branch ID' })
  @ApiResponse({ status: 200, description: 'Role assigned successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @RequireRole('chain_owner', 'branch_manager')
  async assignRole(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Body() assignRoleDto: AssignRoleDto,
    @CurrentUser() user: User,
  ) {
    return this.usersService.assignRole(userId, branchId, assignRoleDto, user.id);
  }

  @Delete(':userId/branch/:branchId')
  @ApiOperation({ summary: 'Remove a user from a branch' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'branchId', description: 'Branch ID' })
  @ApiResponse({ status: 200, description: 'User removed successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @RequireRole('chain_owner', 'branch_manager')
  async remove(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @CurrentUser() user: User,
  ) {
    await this.usersService.remove(userId, branchId, user.id);
    return { message: 'User removed successfully' };
  }
}