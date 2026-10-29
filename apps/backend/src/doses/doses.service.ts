import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DosesService {
  constructor(private readonly prisma: PrismaService) {}

  async getHistory(limit = 50) {
    return this.prisma.doseLog.findMany({
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

