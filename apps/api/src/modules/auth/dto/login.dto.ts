import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'password123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: 'Chain slug for multi-chain users',
    example: 'my-restaurant-chain',
    required: false,
  })
  @IsString()
  @IsOptional()
  chain_slug?: string;

  @ApiProperty({
    description: 'Branch slug for multi-branch users',
    example: 'downtown-branch',
    required: false,
  })
  @IsString()
  @IsOptional()
  branch_slug?: string;
}