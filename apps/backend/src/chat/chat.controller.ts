import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { ChatService, ChatResponse } from './chat.service';
import { ChatMessageDto } from './dto/chat-message.dto';

@ApiTags('AI Chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('ask')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Process medical chat query with strict user database isolation',
    description:
      'Queries the designated user database for active medications, inventory, and doses. Feeds clinical dossier to the Real AI Agent (Gemini/OpenAI) to return personalized medical answers.',
  })
  @ApiHeader({
    name: 'x-user-id',
    required: false,
    description: 'Active User ID for strict database scoping',
  })
  @ApiHeader({
    name: 'x-user-email',
    required: false,
    description: 'Active User Email for strict database scoping',
  })
  @ApiResponse({
    status: 200,
    description: 'Personalized AI response with dynamic suggestion chips',
  })
  async ask(
    @Body() dto: ChatMessageDto,
    @Headers('x-user-id') headerUserId?: string,
    @Headers('x-user-email') headerUserEmail?: string,
  ): Promise<ChatResponse> {
    return this.chatService.processChat(dto, headerUserId, headerUserEmail);
  }
}
