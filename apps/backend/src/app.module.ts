import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { MedicationsModule } from './medications/medications.module';
import { DosesModule } from './doses/doses.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    MedicationsModule,
    DosesModule,
    HealthModule,
  ],
})
export class AppModule {}

