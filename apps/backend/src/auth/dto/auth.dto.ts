import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Rahman Ahmed', description: 'User full name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'rahman@medirem.app', description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: 'medirem123', description: 'Password (min 6 characters)' })
  @IsString()
  @IsOptional()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({ example: '+1 (555) 234-5678', description: 'Phone / emergency contact' })
  @IsString()
  @IsOptional()
  phone?: string;
}

export class VerifySignupDto {
  @ApiProperty({ example: 'rahman@medirem.app', description: 'Email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456', description: '6-digit email verification code' })
  @IsString()
  @IsNotEmpty()
  code: string;
}

export class ResendVerifyCodeDto {
  @ApiProperty({ example: 'rahman@medirem.app', description: 'Email address' })
  @IsEmail()
  email: string;
}

export class LoginDto {
  @ApiProperty({ example: 'rahman@medirem.app', description: 'Email address' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: 'medirem123', description: 'Account password' })
  @IsString()
  @IsOptional()
  password?: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'rahman@medirem.app', description: 'Registered email address' })
  @IsEmail()
  email: string;
}

export class VerifyResetCodeDto {
  @ApiProperty({ example: 'rahman@medirem.app', description: 'Registered email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456', description: '6-digit password reset code' })
  @IsString()
  @IsNotEmpty()
  code: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'rahman@medirem.app', description: 'Registered email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456', description: '6-digit password reset code' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'NewSecurePassword123!', description: 'New password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword: string;
}
