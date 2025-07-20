import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsBoolean } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({
    description: 'User email',
    example: 'user@example.com',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
    required: false,
  })
  @IsString()
  @IsOptional()
  full_name?: string;

  @ApiProperty({
    description: 'User phone number',
    example: '+1234567890',
    required: false,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    description: 'User avatar URL',
    example: 'https://example.com/avatar.jpg',
    required: false,
  })
  @IsString()
  @IsOptional()
  avatar_url?: string;

  @ApiProperty({
    description: 'User active status',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}