import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, IsBoolean } from 'class-validator';

export class CreateMedicationDto {
  @ApiProperty({ example: 'Amoxicillin', description: 'Name of the medication' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '500mg', description: 'Dosage amount' })
  @IsString()
  @IsNotEmpty()
  dosage: string;

  @ApiPropertyOptional({ example: 'Take with food and a full glass of water', description: 'Instructions' })
  @IsString()
  @IsOptional()
  instructions?: string;

  @ApiPropertyOptional({ example: 'Twice daily', description: 'Frequency description' })
  @IsString()
  @IsOptional()
  frequency?: string;

  @ApiPropertyOptional({ example: 'Mon,Wed,Fri', description: 'Days of week' })
  @IsString()
  @IsOptional()
  selectedDays?: string;

  @ApiPropertyOptional({ example: '2026-10-31', description: 'Schedule start date' })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-11-14', description: 'Schedule end date' })
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ example: '08:00 AM', description: 'Primary dose time' })
  @IsString()
  @IsOptional()
  time?: string;

  @ApiPropertyOptional({ example: 'Morning', description: 'Time slot: Morning, Afternoon, Evening, Night' })
  @IsString()
  @IsOptional()
  timeSlot?: string;

  @ApiPropertyOptional({
    example: '[{"slot":"Morning","time":"08:00 AM"},{"slot":"Afternoon","time":"01:00 PM"},{"slot":"Night","time":"08:00 PM"}]',
    description: 'JSON array of multiple daily dose times (e.g. 3 times a day: Morning, Noon, Night)',
  })
  @IsString()
  @IsOptional()
  times?: string;

  @ApiPropertyOptional({ example: 30, description: 'Current pills left in inventory' })
  @IsInt()
  @IsOptional()
  pillsLeft?: number;

  @ApiPropertyOptional({ example: 60, description: 'Total capacity pills' })
  @IsInt()
  @IsOptional()
  totalPills?: number;

  @ApiPropertyOptional({ example: 'https://storage.../pill.png', description: 'Medication photo / icon URL' })
  @IsString()
  @IsOptional()
  imageUri?: string;

  @ApiPropertyOptional({ example: 'active', description: 'Status: active, completed, paused' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ example: true, description: 'Whether loud alarms are enabled for this med' })
  @IsBoolean()
  @IsOptional()
  alarmEnabled?: boolean;

  @ApiPropertyOptional({ example: 'notif_123', description: 'Associated local notification ID' })
  @IsString()
  @IsOptional()
  notificationId?: string;

  @ApiPropertyOptional({ example: 'usr_uuid', description: 'Owner user ID' })
  @IsString()
  @IsOptional()
  userId?: string;
}
