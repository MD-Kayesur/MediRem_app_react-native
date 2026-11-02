import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get current authenticated user profile
   */
  async getMe(userId?: string, userEmail?: string) {
    let user = null;

    // 1. Try finding by UUID if provided
    if (userId) {
      user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          _count: {
            select: { medications: true },
          },
        },
      });
    }

    // 2. If not found by ID or if ID wasn't provided, try by email
    if (!user && userEmail) {
      const cleanEmail = userEmail.trim().toLowerCase();
      user = await this.prisma.user.findUnique({
        where: { email: cleanEmail },
        include: {
          _count: {
            select: { medications: true },
          },
        },
      });
    }

    if (!user) {
      throw new NotFoundException('No active user profile found. Please sign in to view your profile.');
    }

    return this.formatUser(user);
  }

  /**
   * Update current authenticated user profile
   */
  async updateMe(
    userId: string | undefined,
    userEmail: string | undefined,
    updateUserDto: UpdateUserDto,
  ) {
    let user = null;
    if (userId) {
      user = await this.prisma.user.findUnique({ where: { id: userId } });
    }
    if (!user && userEmail) {
      user = await this.prisma.user.findUnique({
        where: { email: userEmail.trim().toLowerCase() },
      });
    }

    if (!user) {
      throw new NotFoundException('User profile not found.');
    }

    let hashedPassword: string | undefined = undefined;
    if (updateUserDto.password) {
      if (updateUserDto.password.length < 6) {
        throw new BadRequestException('Password must be at least 6 characters long.');
      }
      hashedPassword = await bcrypt.hash(updateUserDto.password, 10);
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        name: updateUserDto.name?.trim() || user.name,
        phone: updateUserDto.phone !== undefined ? updateUserDto.phone?.trim() || null : user.phone,
        avatarUrl: updateUserDto.avatarUrl !== undefined ? updateUserDto.avatarUrl?.trim() || null : user.avatarUrl,
        ...(hashedPassword ? { password: hashedPassword } : {}),
      },
      include: {
        _count: { select: { medications: true } },
      },
    });

    return this.formatUser(updated);
  }

  /**
   * Change password for the current authenticated user
   */
  async changePassword(
    userId: string | undefined,
    userEmail: string | undefined,
    data: { currentPassword?: string; newPassword: string },
  ) {
    let user = null;
    if (userId) {
      user = await this.prisma.user.findUnique({ where: { id: userId } });
    }
    if (!user && userEmail) {
      user = await this.prisma.user.findUnique({
        where: { email: userEmail.trim().toLowerCase() },
      });
    }

    if (!user) {
      throw new NotFoundException('User profile not found. Please log in.');
    }

    if (!data.newPassword || data.newPassword.length < 6) {
      throw new BadRequestException('New password must be at least 6 characters long.');
    }

    if (user.password && data.currentPassword) {
      const isBcrypt = user.password.startsWith('$2a$') || user.password.startsWith('$2b$');
      const matches = isBcrypt
        ? await bcrypt.compare(data.currentPassword, user.password)
        : user.password === data.currentPassword;

      if (!matches) {
        throw new BadRequestException('Current password does not match.');
      }
    }

    const hashedPassword = await bcrypt.hash(data.newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return {
      success: true,
      message: 'Password changed successfully! You can now use your new password.',
    };
  }

  /**
   * [Admin Only] Retrieve all registered users
   * Requires verified ADMIN privileges
   */
  async findAll(adminId?: string, adminEmail?: string) {
    let requester = null;
    if (adminId) {
      requester = await this.prisma.user.findUnique({
        where: { id: adminId },
      });
    }
    if (!requester && adminEmail) {
      requester = await this.prisma.user.findUnique({
        where: { email: adminEmail.trim().toLowerCase() },
      });
    }

    if (!requester || requester.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Access Denied: Only administrators have permission to access the admin panel user list.',
      );
    }

    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        avatarUrl: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { medications: true },
        },
      },
    });

    return {
      success: true,
      total: users.length,
      data: users.map((u) => ({
        ...u,
        medicationsCount: u._count.medications,
      })),
    };
  }

  /**
   * Get single user by ID
   */
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        _count: { select: { medications: true } },
        medications: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            dosage: true,
            time: true,
            timeSlot: true,
            status: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" was not found.`);
    }

    return this.formatUser(user);
  }

  /**
   * [Admin Only] Create a new user account directly
   */
  async create(createUserDto: CreateUserDto) {
    const cleanEmail = createUserDto.email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      throw new ConflictException(`User with email "${cleanEmail}" already exists.`);
    }

    let hashedPassword: string | undefined = undefined;
    if (createUserDto.password) {
      hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    }

    const newUser = await this.prisma.user.create({
      data: {
        name: createUserDto.name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        phone: createUserDto.phone?.trim() || null,
        role: createUserDto.role || 'USER',
        avatarUrl: createUserDto.avatarUrl?.trim() || null,
        isVerified: true, // Created by admin, pre-verified
      },
      include: {
        _count: { select: { medications: true } },
      },
    });

    this.logger.log(`Created new user ${newUser.email} with role ${newUser.role}`);
    return this.formatUser(newUser);
  }

  /**
   * Update user by ID
   */
  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" was not found.`);
    }

    let hashedPassword = user.password;
    if (updateUserDto.password) {
      hashedPassword = await bcrypt.hash(updateUserDto.password, 10);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        name: updateUserDto.name?.trim() || user.name,
        email: updateUserDto.email ? updateUserDto.email.trim().toLowerCase() : user.email,
        password: hashedPassword,
        phone: updateUserDto.phone !== undefined ? updateUserDto.phone?.trim() || null : user.phone,
        role: updateUserDto.role || user.role,
        avatarUrl: updateUserDto.avatarUrl !== undefined ? updateUserDto.avatarUrl?.trim() || null : user.avatarUrl,
        isVerified: updateUserDto.isVerified !== undefined ? updateUserDto.isVerified : user.isVerified,
      },
      include: {
        _count: { select: { medications: true } },
      },
    });

    return this.formatUser(updated);
  }

  /**
   * [Admin Only] Delete a user account
   */
  async remove(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" was not found.`);
    }

    await this.prisma.user.delete({ where: { id } });
    this.logger.log(`Deleted user ${user.email} (${id})`);

    return {
      success: true,
      message: `User ${user.email} has been successfully deleted.`,
    };
  }

  /**
   * Helper to format user response safely (strip sensitive passwords/tokens)
   */
  private formatUser(user: any) {
    const { password, verifyCode, resetCode, verifyCodeExpiresAt, resetCodeExpiresAt, ...safe } = user;
    return {
      success: true,
      data: {
        ...safe,
        medicationsCount: safe._count?.medications ?? safe.medicationsCount ?? 0,
      },
    };
  }
}
