import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatHistoryItem {
  @ApiProperty({ enum: ['ai', 'user'] })
  @IsString()
  sender: 'ai' | 'user';

  @ApiProperty()
  @IsString()
  text: string;
}

export class ChatMessageDto {
  @ApiProperty({ description: 'User message or clinical question' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ description: 'User ID for database isolation' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ description: 'User Email for database lookup' })
  @IsString()
  @IsOptional()
  userEmail?: string;

  @ApiPropertyOptional({
    description: 'Recent conversation history for conversational context',
    type: [ChatHistoryItem],
  })
  @IsArray()
  @IsOptional()
  conversationHistory?: ChatHistoryItem[];
}
