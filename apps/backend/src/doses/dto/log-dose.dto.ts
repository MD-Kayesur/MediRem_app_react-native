import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LogDoseDto {
  @ApiProperty({ example: 'med_uuid_12345', description: 'Associated medication UUID' })
  @IsString()
  @IsNotEmpty()
  medicationId: string;

  @ApiProperty({ example: '08:00 AM', description: 'Scheduled dose time' })
  @IsString()
  @IsNotEmpty()
  scheduledTime: string;

  @ApiPropertyOptional({ example: 'taken', description: 'Dose status: taken, skipped, missed' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ example: 'Taken with breakfast', description: 'Optional patient notes' })
  @IsString()
  @IsOptional()
  note?: string;
}
