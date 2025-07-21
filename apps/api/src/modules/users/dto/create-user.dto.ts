import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { BranchRole } from '../../types';

export class CreateUserDto {
  @ApiProperty({
    description: 'User email',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'password123',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  full_name: string;

  @ApiProperty({
    description: 'User phone number',
    example: '+1234567890',
    required: false,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    description: 'Branch ID to assign user to',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsUUID()
  @IsNotEmpty()
  branch_id: string;

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
  @IsOptional()
  permissions?: string[];
}