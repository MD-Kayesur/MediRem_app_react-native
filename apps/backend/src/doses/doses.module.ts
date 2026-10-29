import { Module } from '@nestjs/common';
import { DosesService } from './doses.service';
import { DosesController } from './doses.controller';

@Module({
  controllers: [DosesController],
  providers: [DosesService],
  exports: [DosesService],
})
export class DosesModule {}

