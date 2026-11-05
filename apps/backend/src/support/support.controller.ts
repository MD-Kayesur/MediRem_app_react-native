import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { SendSupportMessageDto } from './dto/support.dto';

@ApiTags('Support')
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('message')
  @ApiOperation({
    summary: '💬 Send support message / bug report',
    description: 'Allows a regular user to message the Admin about a bug/issue, or Admin to reply to a user.',
  })
  @ApiHeader({ name: 'x-user-id', required: false, description: 'Authenticated user UUID' })
  @ApiHeader({ name: 'x-user-email', required: false, description: 'Authenticated user email' })
  @ApiResponse({ status: 201, description: 'Message sent successfully.' })
  async sendMessage(
    @Body() body: SendSupportMessageDto,
    @Headers('x-user-id') headerUserId?: string,
    @Headers('x-user-email') headerUserEmail?: string,
  ) {
    const callerId = headerUserId;
    if (!callerId && !headerUserEmail) {
      throw new BadRequestException('User identification header (x-user-id or x-user-email) is required.');
    }
    return this.supportService.sendMessage(callerId || '', headerUserEmail, body);
  }

  @Get('thread')
  @ApiOperation({
    summary: '📜 Get conversation messages for thread',
    description: 'Retrieves all messages in a support thread. Normal users get their own thread; Admins can pass targetUserId.',
  })
  @ApiHeader({ name: 'x-user-id', required: false, description: 'Authenticated user UUID' })
  @ApiHeader({ name: 'x-user-email', required: false, description: 'Authenticated user email' })
  @ApiQuery({ name: 'userId', required: false, description: 'Target user ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'Messages list retrieved.' })
  async getThreadMessages(
    @Query('userId') targetUserId?: string,
    @Headers('x-user-id') headerUserId?: string,
    @Headers('x-user-email') headerUserEmail?: string,
  ) {
    const callerId = headerUserId;
    if (!callerId && !headerUserEmail) {
      throw new BadRequestException('User identification header is required.');
    }
    return this.supportService.getThreadMessages(callerId || '', headerUserEmail, targetUserId);
  }

  @Get('admin/threads')
  @ApiOperation({
    summary: '🛡️ Admin: List all user support threads',
    description: 'Returns all conversation threads grouped by user, along with unread counts.',
  })
  @ApiHeader({ name: 'x-user-id', required: true, description: 'Admin user UUID' })
  @ApiHeader({ name: 'x-user-email', required: false, description: 'Admin user email' })
  @ApiResponse({ status: 200, description: 'All threads retrieved for admin.' })
  async getAdminThreads(
    @Headers('x-user-id') headerUserId?: string,
    @Headers('x-user-email') headerUserEmail?: string,
  ) {
    if (!headerUserId && !headerUserEmail) {
      throw new BadRequestException('Admin user identification is required.');
    }
    return this.supportService.getAdminThreads(headerUserId || '', headerUserEmail);
  }

  @Get('unread-count')
  @ApiOperation({
    summary: '🔔 Get unread support badge count',
    description: 'Returns count of unread messages for either regular user (from admin) or admin (from users).',
  })
  @ApiHeader({ name: 'x-user-id', required: true, description: 'User UUID' })
  @ApiHeader({ name: 'x-user-email', required: false, description: 'User email' })
  @ApiResponse({ status: 200, description: 'Unread badge count returned.' })
  async getUnreadCount(
    @Headers('x-user-id') headerUserId?: string,
    @Headers('x-user-email') headerUserEmail?: string,
  ) {
    return this.supportService.getUnreadBadge(headerUserId || '', headerUserEmail);
  }
}

