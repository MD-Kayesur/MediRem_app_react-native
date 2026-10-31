import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';
import { MedicationsService } from './medications.service';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';

@ApiTags('Medications')
@Controller('medications')
export class MedicationsController {
  constructor(private readonly medicationsService: MedicationsService) {}

  @Get()
  @ApiOperation({
    summary: '💊 Get all medications',
    description: 'Retrieves all user medications, schedules, and pill counts from Neon DB. Filterable by user.',
  })
  @ApiQuery({ name: 'userId', required: false, description: 'Optional user UUID filter' })
  @ApiHeader({ name: 'x-user-id', required: false, description: 'User UUID from client header' })
  @ApiResponse({ status: 200, description: 'List of medications.' })
  findAll(
    @Query('userId') queryUserId?: string,
    @Headers('x-user-id') headerUserId?: string,
  ) {
    const userId = queryUserId || headerUserId;
    return this.medicationsService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({
    summary: '🔍 Get medication by ID',
    description: 'Retrieves specific medication schedule and details by UUID.',
  })
  @ApiParam({ name: 'id', description: 'Medication UUID' })
  @ApiResponse({ status: 200, description: 'Medication details.' })
  @ApiResponse({ status: 404, description: 'Medication not found.' })
  findOne(@Param('id') id: string) {
    return this.medicationsService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '➕ Create new medication',
    description: 'Adds a new medication schedule with dose times and inventory tracking to Neon DB.',
  })
  @ApiHeader({ name: 'x-user-id', required: false, description: 'User UUID from client header' })
  @ApiResponse({ status: 201, description: 'Medication created successfully.' })
  create(
    @Body() createMedicationDto: CreateMedicationDto,
    @Headers('x-user-id') headerUserId?: string,
  ) {
    return this.medicationsService.create(createMedicationDto, headerUserId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: '✏️ Update medication',
    description: 'Updates medication information, dosages, schedules, or pill counts.',
  })
  @ApiParam({ name: 'id', description: 'Medication UUID' })
  @ApiResponse({ status: 200, description: 'Medication updated successfully.' })
  update(@Param('id') id: string, @Body() updateMedicationDto: UpdateMedicationDto) {
    return this.medicationsService.update(id, updateMedicationDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: '🗑️ Delete medication',
    description: 'Permanently removes a medication schedule from Neon DB.',
  })
  @ApiParam({ name: 'id', description: 'Medication UUID' })
  @ApiResponse({ status: 200, description: 'Medication deleted successfully.' })
  remove(@Param('id') id: string) {
    return this.medicationsService.remove(id);
  }

  @Post(':id/take-dose')
  @ApiOperation({
    summary: '⏱️ Take dose / Log intake',
    description: 'Decrements pill inventory by 1, silences alarm, and records dose intake in DoseLog table for specific scheduled time (e.g. Morning, Noon, Night).',
  })
  @ApiParam({ name: 'id', description: 'Medication UUID' })
  @ApiResponse({ status: 200, description: 'Dose logged and inventory decremented.' })
  takeDose(@Param('id') id: string, @Body('scheduledTime') scheduledTime?: string) {
    return this.medicationsService.takeDose(id, scheduledTime);
  }
}
