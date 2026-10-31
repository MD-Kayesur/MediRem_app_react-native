import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  VerifySignupDto,
  ResendVerifyCodeDto,
  LoginDto,
  ForgotPasswordDto,
  VerifyResetCodeDto,
  ResetPasswordDto,
} from './dto/auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: '📝 Register new user account',
    description: 'Registers a new user account in Neon DB and dispatches a 6-digit email verification code.',
  })
  @ApiResponse({ status: 201, description: 'Account registration initiated. Verification code sent.' })
  @ApiResponse({ status: 409, description: 'Email address is already in use.' })
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Post('verify-signup')
  @ApiOperation({
    summary: '✅ Verify signup 6-digit code',
    description: 'Activates user account upon verifying the 6-digit verification code sent via Gmail.',
  })
  @ApiResponse({ status: 200, description: 'Account verified successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid or expired code.' })
  async verifySignup(@Body() body: VerifySignupDto) {
    return this.authService.verifySignup(body);
  }

  @Post('resend-verify-code')
  @ApiOperation({
    summary: '🔄 Resend signup verification code',
    description: 'Generates and resends a fresh 6-digit verification code to the registered email.',
  })
  @ApiResponse({ status: 200, description: 'New verification code sent.' })
  async resendVerifyCode(@Body() body: ResendVerifyCodeDto) {
    return this.authService.resendSignupCode(body);
  }

  @Post('login')
  @ApiOperation({
    summary: '🔑 Login with email and password',
    description: 'Authenticates a verified user and returns user credentials and token.',
  })
  @ApiResponse({ status: 200, description: 'Authentication successful.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials or unverified email.' })
  async login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Post('forgot-password')
  @ApiOperation({
    summary: '📩 Request password reset code',
    description: 'Sends a 6-digit recovery code to the registered email address.',
  })
  @ApiResponse({ status: 200, description: 'Reset code sent if email exists.' })
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body);
  }

  @Post('verify-code')
  @ApiOperation({
    summary: '🔢 Verify password reset code',
    description: 'Verifies that the provided 6-digit code matches the password reset request.',
  })
  @ApiResponse({ status: 200, description: 'Code verified successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid or expired code.' })
  async verifyCode(@Body() body: VerifyResetCodeDto) {
    return this.authService.verifyCode(body);
  }

  @Post('reset-password')
  @ApiOperation({
    summary: '🔒 Reset password with code',
    description: 'Updates user password after verifying the 6-digit reset code.',
  })
  @ApiResponse({ status: 200, description: 'Password reset successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid or expired reset code.' })
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body);
  }

  @Get('profile/:id')
  @ApiOperation({
    summary: '👤 Get auth profile by ID',
    description: 'Retrieves public user auth profile by user ID.',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully.' })
  async getProfile(@Param('id') id: string) {
    return this.authService.getProfile(id);
  }
}
