import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { BranchRole } from '../../../types/auth';

export class AssignRoleDto {
  @ApiProperty({
    description: 'User role',
    example: 'branch_staff',
    enum: ['branch_manager', 'branch_staff', 'branch_cashier'],
  })
  @IsString()
  @IsNotEmpty()
  role: BranchRole;

  @ApiProperty({
    description: 'User permissions',
    example: ['menu:read', 'orders:read', 'orders:write'],
    type: [String],
    required: false,
  })
  @IsArray()
  @IsOptional()
  permissions?: string[];
}