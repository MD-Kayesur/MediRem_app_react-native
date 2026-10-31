import { Controller, Get, Post, Body, Query, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiHeader } from '@nestjs/swagger';
import { DosesService } from './doses.service';
import { LogDoseDto } from './dto/log-dose.dto';

@ApiTags('Doses')
@Controller('doses')
export class DosesController {
  constructor(private readonly dosesService: DosesService) {}

  @Get('history')
  @ApiOperation({
    summary: '📜 Get dose intake history',
    description: 'Retrieves patient dose history and intake logs with medication details from Neon DB. Filterable by user.',
  })
  @ApiQuery({ name: 'limit', required: false, description: 'Max number of history entries (default: 50)' })
  @ApiQuery({ name: 'userId', required: false, description: 'Optional user UUID filter' })
  @ApiHeader({ name: 'x-user-id', required: false, description: 'User UUID from client header' })
  @ApiResponse({ status: 200, description: 'Dose history records.' })
  getHistory(
    @Query('limit') limit?: string,
    @Query('userId') queryUserId?: string,
    @Headers('x-user-id') headerUserId?: string,
  ) {
    const numLimit = limit ? parseInt(limit, 10) : 50;
    const userId = queryUserId || headerUserId;
    return this.dosesService.getHistory(numLimit, userId);
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
