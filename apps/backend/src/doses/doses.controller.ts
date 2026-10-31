import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DosesService } from './doses.service';
import { LogDoseDto } from './dto/log-dose.dto';

@ApiTags('Doses')
@Controller('doses')
export class DosesController {
  constructor(private readonly dosesService: DosesService) {}

  @Get('history')
  @ApiOperation({
    summary: '📜 Get dose intake history',
    description: 'Retrieves patient dose history and intake logs with medication details from Neon DB.',
  })
  @ApiQuery({ name: 'limit', required: false, description: 'Max number of history entries (default: 50)' })
  @ApiResponse({ status: 200, description: 'Dose history records.' })
  getHistory(@Query('limit') limit?: string) {
    const numLimit = limit ? parseInt(limit, 10) : 50;
    return this.dosesService.getHistory(numLimit);
  }

  @Post('log')
  @ApiOperation({
    summary: '📝 Log a dose event',
    description: 'Records a taken, skipped, or missed dose event in the DoseLog table.',
  })
  @ApiResponse({ status: 201, description: 'Dose intake logged successfully.' })
  logDose(@Body() body: LogDoseDto) {
    return this.dosesService.logDose(body);
  }
}
