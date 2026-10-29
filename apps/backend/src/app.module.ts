import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { MedicationsModule } from './medications/medications.module';
import { DosesModule } from './doses/doses.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { StorageModule } from './storage/storage.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    MailModule,
    MedicationsModule,
    DosesModule,
    HealthModule,
    StorageModule,
  ],
})
export class AppModule {}
