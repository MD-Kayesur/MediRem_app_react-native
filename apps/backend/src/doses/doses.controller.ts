import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { DosesService } from './doses.service';

@Controller('doses')
export class DosesController {
  constructor(private readonly dosesService: DosesService) {}

  @Get('history')
  getHistory(@Query('limit') limit?: string) {
    const numLimit = limit ? parseInt(limit, 10) : 50;
    return this.dosesService.getHistory(numLimit);
  }

  @Post('log')
  logDose(
    @Body()
    body: {
      medicationId: string;
      scheduledTime: string;
      status?: string;
      note?: string;
    },
  ) {
    return this.dosesService.logDose(body);
  }
}

