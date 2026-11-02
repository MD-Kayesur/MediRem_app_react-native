import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';

@Injectable()
export class MedicationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve a persistent user ID from either a UUID or user email address
   */
  private async resolveUserId(userId?: string, userEmail?: string): Promise<string | null> {
    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (user) {
        return user.id;
      }
      // In case the client passed an email in the userId field
      if (userId.includes('@')) {
        const userByEmail = await this.prisma.user.findFirst({
          where: { email: { equals: userId.trim(), mode: 'insensitive' } },
        });
        if (userByEmail) {
          return userByEmail.id;
        }
      }
    }

    if (userEmail) {
      const user = await this.prisma.user.findFirst({
        where: { email: { equals: userEmail.trim(), mode: 'insensitive' } },
      });
      if (user) {
        return user.id;
      }
    }

    return null;
  }

  /**
   * Strictly retrieve medications for the designated user only.
   * If no user is identified, returns an empty array to prevent cross-user data leakage.
   */
  async findAll(userId?: string, userEmail?: string) {
    const resolvedUserId = await this.resolveUserId(userId, userEmail);

    if (!resolvedUserId) {
      // Unauthenticated / unidentified callers cannot view any medications
      return [];
    }

    return this.prisma.medication.findMany({
      where: {
        userId: resolvedUserId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        doseLogs: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  async findOne(id: string, userId?: string, userEmail?: string) {
    const med = await this.prisma.medication.findUnique({
      where: { id },
      include: {
        doseLogs: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
    if (!med) {
      throw new NotFoundException(`Medication with ID "${id}" not found`);
    }

    const resolvedUserId = await this.resolveUserId(userId, userEmail);
    // Strict isolation: if a caller user ID is present and does not match medication owner, deny access
    if (resolvedUserId && med.userId && med.userId !== resolvedUserId) {
      throw new NotFoundException(`Medication with ID "${id}" not found`);
    }

    return med;
  }

  async create(dto: CreateMedicationDto, headerUserId?: string, headerUserEmail?: string) {
    let resolvedUserId = await this.resolveUserId(
      dto.userId || headerUserId,
      dto.userEmail || headerUserEmail,
    );

    // If an email was provided but no user account existed yet, create user record to guarantee tracking
    const finalEmail = (
      dto.userEmail ||
      headerUserEmail ||
      (dto.userId?.includes('@') ? dto.userId : undefined)
    )?.trim()?.toLowerCase();

    if (!resolvedUserId && finalEmail) {
      const newUser = await this.prisma.user.create({
        data: {
          email: finalEmail,
          name: finalEmail.split('@')[0],
          isVerified: true,
        },
      });
      resolvedUserId = newUser.id;
    }

    return this.prisma.medication.create({
      data: {
        name: dto.name,
        dosage: dto.dosage,
        instructions: dto.instructions ?? 'After food',
        frequency: dto.frequency ?? 'Every day',
        selectedDays: dto.selectedDays,
        startDate: dto.startDate,
        endDate: dto.endDate ?? 'Ongoing',
        time: dto.time ?? '08:00 AM',
        timeSlot: dto.timeSlot ?? 'Morning',
        times: dto.times,
        pillsLeft: dto.pillsLeft ?? 30,
        totalPills: dto.totalPills ?? 30,
        imageUri: dto.imageUri,
        status: dto.status ?? 'active',
        alarmEnabled: dto.alarmEnabled ?? true,
        notificationId: dto.notificationId,
        userId: resolvedUserId || null,
      },
      include: {
        doseLogs: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  async update(id: string, dto: UpdateMedicationDto, userId?: string, userEmail?: string) {
    await this.findOne(id, userId, userEmail);
    return this.prisma.medication.update({
      where: { id },
      data: dto,
      include: {
        doseLogs: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  async remove(id: string, userId?: string, userEmail?: string) {
    await this.findOne(id, userId, userEmail);
    return this.prisma.medication.delete({
      where: { id },
    });
  }

  async takeDose(id: string, scheduledTime?: string, userId?: string, userEmail?: string) {
    const med = await this.findOne(id, userId, userEmail);
    const updatedPills = Math.max(0, med.pillsLeft - 1);
    const targetScheduledTime = scheduledTime || med.time;

    const [updatedMed, log] = await this.prisma.$transaction([
      this.prisma.medication.update({
        where: { id },
        data: { pillsLeft: updatedPills },
      }),
      this.prisma.doseLog.create({
        data: {
          medicationId: id,
          scheduledTime: targetScheduledTime,
          status: 'taken',
        },
      }),
    ]);

    return {
      medication: updatedMed,
      doseLog: log,
      message: `Dose of ${med.name} at ${targetScheduledTime} marked as taken. Remaining pills: ${updatedPills}`,
    };
  }
}

