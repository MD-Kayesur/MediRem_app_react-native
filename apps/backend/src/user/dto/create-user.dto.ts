import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: 'MD Kayesur', description: 'Full name of the user' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'rmdkayesur@gmail.com', description: 'Unique email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ example: 'Password123!', description: 'User login password (min 6 characters)' })
  @IsString()
  @IsOptional()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({ example: '+1 (555) 234-5678', description: 'Contact phone number' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ enum: Role, default: Role.USER, description: 'User permission role (USER or ADMIN)' })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @ApiPropertyOptional({ example: 'https://images.unsplash.com/photo-avatar.jpg', description: 'Profile avatar picture URL' })
  @IsString()
  @IsOptional()
  avatarUrl?: string;
}
