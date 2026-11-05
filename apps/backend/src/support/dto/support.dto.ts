import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendSupportMessageDto {
  @ApiProperty({
    example: 'I found an issue with the alarm sound not triggering when phone is locked.',
    description: 'The support message or bug report content',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({
    example: '84749ce8-8312-434c-b3dc-70c1f34506f3',
    description: 'Target regular user ID (Required when Admin is replying to a specific user thread)',
  })
  @IsString()
  @IsOptional()
  userId?: string;
}

