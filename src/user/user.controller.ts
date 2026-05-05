import { Body, Controller, Delete, Get, Patch, Req } from '@nestjs/common';
import { UserService } from './user.service';
import type { Request } from 'express';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  profile(@Req() req: Request) {
    return this.userService.profile(req?.cookies.access_token);
  }

  @Patch('profile')
  async updateProfile(@Req() req: Request, @Body() dto: UpdateUserDto) {
    return this.userService.updateProfile(req?.cookies.access_token, dto);
  }

  @Delete('delete-account')
  async deleteAccount(@Req() req: Request) {
    return this.userService.deleteAccount(req?.cookies.access_token);
  }
}
