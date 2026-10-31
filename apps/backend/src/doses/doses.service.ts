import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DosesService {
  constructor(private readonly prisma: PrismaService) {}

  async getHistory(limit = 50, userId?: string) {
    if (!userId) {
      // Strictly prevent cross-user data leakage: return empty array if no user is specified
      return [];
    }

    return this.prisma.doseLog.findMany({
      where: {
        medication: {
          userId,
        },
      },
      take: limit,
      orderBy: { takenAt: 'desc' },
      include: {
        medication: {
          select: {
            id: true,
            name: true,
            dosage: true,
            imageUri: true,
            time: true,
            userId: true,
          },
        },
      },
    });
  }

  async logDose(data: { medicationId: string; scheduledTime: string; status?: string; note?: string }) {
    return this.prisma.doseLog.create({
      data: {
        medicationId: data.medicationId,
        scheduledTime: data.scheduledTime,
        status: data.status ?? 'taken',
        note: data.note,
      },
    });
  }
}

