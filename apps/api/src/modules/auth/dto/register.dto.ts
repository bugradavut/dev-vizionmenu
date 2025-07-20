import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, Matches } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'owner@restaurant.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePassword123!',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiProperty({
    description: 'Full name of the user',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  full_name: string;

  @ApiProperty({
    description: 'Phone number',
    example: '+1234567890',
    required: false,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    description: 'Restaurant chain name',
    example: 'My Restaurant Chain',
  })
  @IsString()
  @IsNotEmpty()
  chain_name: string;

  @ApiProperty({
    description: 'Restaurant chain slug (URL-friendly)',
    example: 'my-restaurant-chain',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Chain slug must contain only lowercase letters, numbers, and hyphens',
  })
  chain_slug: string;

  @ApiProperty({
    description: 'First branch name',
    example: 'Downtown Location',
  })
  @IsString()
  @IsNotEmpty()
  first_branch_name: string;

  @ApiProperty({
    description: 'First branch slug (URL-friendly)',
    example: 'downtown-location',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Branch slug must contain only lowercase letters, numbers, and hyphens',
  })
  first_branch_slug: string;
}