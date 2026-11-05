import { Module } from '@nestjs/common';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { SupportGateway } from './support.gateway';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SupportController],
  providers: [SupportService, SupportGateway],
  exports: [SupportService, SupportGateway],
})
export class SupportModule {}

