import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  @Get()
  async check() {
    let dbStatus = 'disconnected';
    let dbLatencyMs = 0;
    let counts = { users: 0, medications: 0, doses: 0 };

    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1 as result`;
      dbLatencyMs = Date.now() - start;
      dbStatus = 'connected';

      const [userCount, medCount, doseCount] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.medication.count(),
        this.prisma.doseLog.count(),
      ]);
      counts = { users: userCount, medications: medCount, doses: doseCount };
    } catch (err: any) {
      dbStatus = `error: ${err.message}`;
    }

    const storageStatus = await this.storage.healthCheck();

    return "backend is running";
  }
}
