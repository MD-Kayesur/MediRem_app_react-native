import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';

@Injectable()
export class MedicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId?: string) {
    return this.prisma.medication.findMany({
      where: userId ? { OR: [{ userId }, { userId: null }] } : {},
      orderBy: { createdAt: 'desc' },
      include: { doseLogs: true },
    });
  }

  async findOne(id: string) {
    const med = await this.prisma.medication.findUnique({
      where: { id },
      include: { doseLogs: true },
    });
    if (!med) {
      throw new NotFoundException(`Medication with ID "${id}" not found`);
    }
    return med;
  }

  async create(dto: CreateMedicationDto, headerUserId?: string) {
    const finalUserId = dto.userId || headerUserId || undefined;
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
        userId: finalUserId,
      },
    });
  }

  async update(id: string, dto: UpdateMedicationDto) {
    await this.findOne(id);
    return this.prisma.medication.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.medication.delete({
      where: { id },
    });
  }

  async takeDose(id: string, scheduledTime?: string) {
    const med = await this.findOne(id);
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

