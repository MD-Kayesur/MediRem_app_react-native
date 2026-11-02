import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Headers,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('User')
@ApiBearerAuth()
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * 1. GET /api/user/me - Current User Profile
   */
  @Get('me')
  @ApiOperation({
    summary: '👤 [User] Get current logged-in user profile',
    description:
      'Permission: Authenticated User. Retrieves the currently logged-in user own profile data, role, phone, and medication count.',
  })
  @ApiHeader({
    name: 'x-user-id',
    required: false,
    description: 'Current authenticated user UUID (optional if passed via query or token)',
  })
  @ApiHeader({
    name: 'x-user-email',
    required: false,
    description: 'Current authenticated user email',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'User UUID override (for testing or dev bypass)',
  })
  @ApiQuery({
    name: 'userEmail',
    required: false,
    description: 'User email override',
  })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'User profile not found.' })
  getMe(
    @Headers('x-user-id') headerUserId?: string,
    @Headers('x-user-email') headerUserEmail?: string,
    @Query('userId') queryUserId?: string,
    @Query('userEmail') queryUserEmail?: string,
  ) {
    const activeUserId = headerUserId || queryUserId;
    const activeUserEmail = headerUserEmail || queryUserEmail;
    return this.userService.getMe(activeUserId, activeUserEmail);
  }

  /**
   * 2. PATCH /api/user/me - Update Current User Profile
   */
  @Patch('me')
  @ApiOperation({
    summary: '✏️ [User] Update current logged-in user profile',
    description:
      'Permission: Authenticated User. Updates name, phone number, or avatar picture for the logged-in user.',
  })
  @ApiHeader({
    name: 'x-user-id',
    required: false,
    description: 'Current user UUID',
  })
  @ApiHeader({
    name: 'x-user-email',
    required: false,
    description: 'Current user email',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'User UUID override',
  })
  @ApiQuery({
    name: 'userEmail',
    required: false,
    description: 'User email override',
  })
  @ApiResponse({ status: 200, description: 'Profile updated successfully.' })
  updateMe(
    @Body() updateUserDto: UpdateUserDto,
    @Headers('x-user-id') headerUserId?: string,
    @Headers('x-user-email') headerUserEmail?: string,
    @Query('userId') queryUserId?: string,
    @Query('userEmail') queryUserEmail?: string,
  ) {
    const activeUserId = headerUserId || queryUserId;
    const activeUserEmail = headerUserEmail || queryUserEmail;
    return this.userService.updateMe(activeUserId, activeUserEmail, updateUserDto);
  }

  /**
   * 2b. POST /api/user/change-password - Change Current User Password
   */
  @Post('change-password')
  @ApiOperation({
    summary: '🔒 [User] Change current user password',
    description: 'Verifies current password and updates to a new password in Neon Cloud DB.',
  })
  @ApiHeader({
    name: 'x-user-id',
    required: false,
    description: 'Current user UUID',
  })
  @ApiHeader({
    name: 'x-user-email',
    required: false,
    description: 'Current user email',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'User UUID override',
  })
  @ApiQuery({
    name: 'userEmail',
    required: false,
    description: 'User email override',
  })
  @ApiResponse({ status: 200, description: 'Password changed successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid current password or new password too short.' })
  changePassword(
    @Body() body: { currentPassword?: string; newPassword: string },
    @Headers('x-user-id') headerUserId?: string,
    @Headers('x-user-email') headerUserEmail?: string,
    @Query('userId') queryUserId?: string,
    @Query('userEmail') queryUserEmail?: string,
  ) {
    const activeUserId = headerUserId || queryUserId;
    const activeUserEmail = headerUserEmail || queryUserEmail;
    return this.userService.changePassword(activeUserId, activeUserEmail, body);
  }

  /**
   * 3. GET /api/user - [Admin Only] All Users List
   */
  @Get()
  @ApiOperation({
    summary: '👑 [Admin Only] Get all registered users (Admin Panel)',
    description:
      'Permission: ⚠️ Administrator Role Only. Restricted exclusively to administrators. Retrieves all registered users in the MediRem database for the admin panel.',
  })
  @ApiHeader({
    name: 'x-user-id',
    required: false,
    description: 'Admin user UUID for authorization verification',
  })
  @ApiHeader({
    name: 'x-user-email',
    required: false,
    description: 'Admin user email for authorization verification',
  })
  @ApiQuery({
    name: 'adminUserId',
    required: false,
    description: 'Admin user UUID fallback for admin panel testing',
  })
  @ApiQuery({
    name: 'adminEmail',
    required: false,
    description: 'Admin user email fallback',
  })
  @ApiResponse({ status: 200, description: 'List of all registered users.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin privileges required.' })
  findAll(
    @Headers('x-user-id') headerUserId?: string,
    @Headers('x-user-email') headerUserEmail?: string,
    @Query('adminUserId') queryAdminUserId?: string,
    @Query('adminEmail') queryAdminEmail?: string,
  ) {
    const adminId = headerUserId || queryAdminUserId;
    const adminEmail = headerUserEmail || queryAdminEmail;
    return this.userService.findAll(adminId, adminEmail);
  }

  /**
   * 4. POST /api/user - [Admin Only] Create New User
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '👑 [Admin Only] Create new user account',
    description:
      'Permission: ⚠️ Administrator Role Only. Creates a new user directly with assigned role (USER/ADMIN) and pre-verification.',
  })
  @ApiResponse({ status: 201, description: 'User account created.' })
  @ApiResponse({ status: 409, description: 'Email address already exists.' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  /**
   * 5. GET /api/user/:id - Get User by ID
   */
  @Get(':id')
  @ApiOperation({
    summary: '🔍 [Admin/User] Get user by ID',
    description:
      'Permission: Admin or User. Retrieves user profile information and recent medications by user UUID.',
  })
  @ApiParam({ name: 'id', description: 'Target user UUID' })
  @ApiResponse({ status: 200, description: 'User profile details.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  /**
   * 6. PATCH /api/user/:id - Update User by ID
   */
  @Patch(':id')
  @ApiOperation({
    summary: '✏️ [Admin/User] Update user by ID',
    description:
      'Permission: Admin or User. Modifies specific user information such as name, role, phone, or verification status.',
  })
  @ApiParam({ name: 'id', description: 'Target user UUID' })
  @ApiResponse({ status: 200, description: 'User updated successfully.' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  /**
   * 7. DELETE /api/user/:id - [Admin Only] Delete User
   */
  @Delete(':id')
  @ApiOperation({
    summary: '🗑️ [Admin Only] Delete user account',
    description:
      'Permission: ⚠️ Administrator Role Only. Permanently removes a user account and cascades associated data.',
  })
  @ApiParam({ name: 'id', description: 'Target user UUID to delete' })
  @ApiResponse({ status: 200, description: 'User deleted successfully.' })
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
