import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body()
    body: {
      name: string;
      email: string;
      password?: string;
      phone?: string;
    },
  ) {
    return this.authService.register(body);
  }

  @Post('verify-signup')
  async verifySignup(
    @Body()
    body: {
      email: string;
      code: string;
    },
  ) {
    return this.authService.verifySignup(body);
  }

  @Post('resend-verify-code')
  async resendVerifyCode(
    @Body()
    body: {
      email: string;
    },
  ) {
    return this.authService.resendSignupCode(body);
  }

  @Post('login')
  async login(@Body() body: { email: string; password?: string }) {
    return this.authService.login(body);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body);
  }

  @Post('verify-code')
  async verifyCode(@Body() body: { email: string; code: string }) {
    return this.authService.verifyCode(body);
  }

  @Post('reset-password')
  async resetPassword(
    @Body()
    body: {
      email: string;
      code: string;
      newPassword: string;
    },
  ) {
    return this.authService.resetPassword(body);
  }

  @Get('profile/:id')
  async getProfile(@Param('id') id: string) {
    return this.authService.getProfile(id);
  }
}
