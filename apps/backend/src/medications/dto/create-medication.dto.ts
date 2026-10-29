import { IsString, IsNotEmpty, IsOptional, IsInt, IsBoolean } from 'class-validator';

export class CreateMedicationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  dosage: string;

  @IsString()
  @IsOptional()
  instructions?: string;

  @IsString()
  @IsOptional()
  frequency?: string;

  @IsString()
  @IsOptional()
  selectedDays?: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  time?: string;

  @IsString()
  @IsOptional()
  timeSlot?: string;

  @IsInt()
  @IsOptional()
  pillsLeft?: number;

  @IsInt()
  @IsOptional()
  totalPills?: number;

  @IsString()
  @IsOptional()
  imageUri?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsBoolean()
  @IsOptional()
  alarmEnabled?: boolean;

  @IsString()
  @IsOptional()
  notificationId?: string;

  @IsString()
  @IsOptional()
  userId?: string;
}

