import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(data: { name: string; email: string; password?: string; phone?: string }) {
    const email = data.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return {
        user: {
          id: existing.id,
          name: existing.name,
          email: existing.email,
          createdAt: existing.createdAt.toISOString(),
        },
        message: 'Account already exists. Signed in.',
      };
    }

    const user = await this.prisma.user.create({
      data: {
        name: data.name.trim(),
        email,
      },
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
      },
      message: 'Account created successfully.',
    };
  }

  async login(data: { email: string; password?: string }) {
    const email = data.email.trim().toLowerCase();
    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Auto-create or login demo user
      const defaultName = email.startsWith('rahman') ? 'Rahman' : email.split('@')[0];
      user = await this.prisma.user.create({
        data: {
          name: defaultName.charAt(0).toUpperCase() + defaultName.slice(1),
          email,
        },
      });
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
      },
      message: 'Signed in successfully.',
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
    return user;
  }
}
