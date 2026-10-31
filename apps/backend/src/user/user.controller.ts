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

@ApiTags('User Profile & Admin Management')
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
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'User UUID override (for testing or dev bypass)',
  })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'User profile not found.' })
  getMe(
    @Headers('x-user-id') headerUserId?: string,
    @Query('userId') queryUserId?: string,
  ) {
    const activeUserId = headerUserId || queryUserId;
    return this.userService.getMe(activeUserId);
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
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'User UUID override',
  })
  @ApiResponse({ status: 200, description: 'Profile updated successfully.' })
  updateMe(
    @Body() updateUserDto: UpdateUserDto,
    @Headers('x-user-id') headerUserId?: string,
    @Query('userId') queryUserId?: string,
  ) {
    const activeUserId = headerUserId || queryUserId;
    return this.userService.updateMe(activeUserId, updateUserDto);
  }

  /**
   * 3. GET /api/user - [Admin Only] All Users List
   */
  @Get()
  @ApiOperation({
    summary: '👑 [Admin Only] Get all registered users',
    description:
      'Permission: ⚠️ Administrator Role Only. Retrieves all registered users in the MediRem database for the admin panel.',
  })
  @ApiResponse({ status: 200, description: 'List of all registered users.' })
  findAll() {
    return this.userService.findAll();
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
