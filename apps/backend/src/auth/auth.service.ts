import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  private generateToken(userId: string): string {
    const payload = `${userId}:${Date.now()}`;
    return Buffer.from(payload).toString('base64');
  }

  /**
   * Register a new user with hashed password
   */
  async register(data: {
    name: string;
    email: string;
    password?: string;
    phone?: string;
  }) {
    const email = data.email.trim().toLowerCase();
    const name = data.name.trim();

    if (!email || !email.includes('@')) {
      throw new BadRequestException('A valid email address is required.');
    }

    if (!name || name.length < 2) {
      throw new BadRequestException('Name must be at least 2 characters long.');
    }

    if (data.password && data.password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters long.');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new BadRequestException(
        'An account with this email already exists. Please sign in instead.',
      );
    }

    // Hash password securely with bcrypt
    let hashedPassword: string | undefined = undefined;
    if (data.password) {
      hashedPassword = await bcrypt.hash(data.password, 10);
    }

    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone: data.phone?.trim() || null,
      },
    });

    const token = this.generateToken(user.id);

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone ?? undefined,
        createdAt: user.createdAt.toISOString(),
      },
      token,
      message: 'Account created successfully! Welcome to MediRem.',
    };
  }

  /**
   * Sign in with email and password
   */
  async login(data: { email: string; password?: string }) {
    const email = data.email.trim().toLowerCase();

    if (!email || !email.includes('@')) {
      throw new BadRequestException('Please provide a valid email address.');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Auto-create demo/test user if it is rahman@medirem.app or demo
      if (email === 'rahman@medirem.app') {
        const demoHashed = await bcrypt.hash(data.password || 'medirem123', 10);
        const demoUser = await this.prisma.user.create({
          data: {
            name: 'Rahman',
            email,
            password: demoHashed,
            phone: '+1 (555) 234-5678',
          },
        });
        const token = this.generateToken(demoUser.id);
        return {
          success: true,
          user: {
            id: demoUser.id,
            name: demoUser.name,
            email: demoUser.email,
            phone: demoUser.phone ?? undefined,
            createdAt: demoUser.createdAt.toISOString(),
          },
          token,
          message: 'Signed in successfully as Demo User.',
        };
      }

      throw new UnauthorizedException(
        'No account found with this email. Please check your email or sign up.',
      );
    }

    // Validate password if user has one
    if (user.password) {
      if (!data.password) {
        throw new BadRequestException('Password is required to sign in.');
      }

      const isBcrypt = user.password.startsWith('$2a$') || user.password.startsWith('$2b$');
      let isValid = false;

      if (isBcrypt) {
        isValid = await bcrypt.compare(data.password, user.password);
      } else {
        // Plaintext legacy password check
        isValid = user.password === data.password;
        if (isValid) {
          // Seamlessly upgrade legacy plaintext password to bcrypt hash
          const upgradedHash = await bcrypt.hash(data.password, 10);
          await this.prisma.user.update({
            where: { id: user.id },
            data: { password: upgradedHash },
          });
        }
      }

      if (!isValid) {
        throw new UnauthorizedException(
          'Incorrect password. Please verify your password or tap "Forgot?" to reset it.',
        );
      }
    }

    const token = this.generateToken(user.id);

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone ?? undefined,
        createdAt: user.createdAt.toISOString(),
      },
      token,
      message: 'Signed in successfully.',
    };
  }

  /**
   * Request password reset code (sends 6-digit OTP via nodemailer)
   */
  async forgotPassword(data: { email: string }) {
    const email = data.email.trim().toLowerCase();

    if (!email || !email.includes('@')) {
      throw new BadRequestException('Please enter a valid email address.');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException(
        'No account found with this email address. Please make sure you entered the correct email.',
      );
    }

    // Generate secure 6-digit verification code
    const code = Math.floor(100000 + crypto.randomInt(900000)).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save OTP code to user record in Neon PostgreSQL
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetCode: code,
        resetCodeExpiresAt: expiresAt,
      },
    });

    // Send email using Nodemailer
    const emailResult = await this.mailService.sendPasswordResetOtp(
      user.email!,
      user.name,
      code,
    );

    return {
      success: true,
      message: `A 6-digit verification code has been sent to ${user.email}.`,
      email: user.email,
      expiresInMinutes: 15,
      previewUrl: emailResult.previewUrl,
      // Pass code in response for testing/local verification
      code,
    };
  }

  /**
   * Verify the 6-digit OTP code before entering new password
   */
  async verifyCode(data: { email: string; code: string }) {
    const email = data.email.trim().toLowerCase();
    const code = data.code.trim();

    if (!email || !code) {
      throw new BadRequestException('Email and verification code are required.');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('User account not found.');
    }

    if (!user.resetCode) {
      throw new BadRequestException(
        'No active password reset request found. Please request a new code.',
      );
    }

    if (user.resetCode !== code) {
      throw new BadRequestException(
        'Invalid verification code. Please check the 6-digit code in your email.',
      );
    }

    if (!user.resetCodeExpiresAt || user.resetCodeExpiresAt < new Date()) {
      throw new BadRequestException(
        'This verification code has expired. Please request a new code.',
      );
    }

    return {
      valid: true,
      message: 'Verification code confirmed. You may now enter a new password.',
    };
  }

  /**
   * Reset password with verified OTP code
   */
  async resetPassword(data: {
    email: string;
    code: string;
    newPassword: string;
  }) {
    const email = data.email.trim().toLowerCase();
    const code = data.code.trim();
    const newPassword = data.newPassword;

    if (!email || !code || !newPassword) {
      throw new BadRequestException(
        'Email, verification code, and new password are required.',
      );
    }

    if (newPassword.length < 6) {
      throw new BadRequestException(
        'New password must be at least 6 characters long.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.resetCode !== code) {
      throw new BadRequestException(
        'Invalid verification code or email address.',
      );
    }

    if (!user.resetCodeExpiresAt || user.resetCodeExpiresAt < new Date()) {
      throw new BadRequestException(
        'This verification code has expired. Please request a new code.',
      );
    }

    // Hash the new password with bcrypt
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset code
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetCode: null,
        resetCodeExpiresAt: null,
      },
    });

    this.logger.log(`Password reset completed successfully for ${user.email}`);

    return {
      success: true,
      message:
        'Your password has been successfully reset! You can now log in with your new password.',
    };
  }

  async getProfile(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { medications: true },
    });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    const { password, resetCode, resetCodeExpiresAt, ...safeUser } = user;
    return safeUser;
  }
}
