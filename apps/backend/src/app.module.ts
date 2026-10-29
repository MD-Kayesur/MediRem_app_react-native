import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { MedicationsModule } from './medications/medications.module';
import { DosesModule } from './doses/doses.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    MedicationsModule,
    DosesModule,
    HealthModule,
  ],
})
export class AppModule {}

