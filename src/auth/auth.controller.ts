import { Controller, Post, Body, Res, Get, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/auth.dto';
import type { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('csrf-token')
  getCsrf(@Req() req: Request) {
    return { csrfToken: req.csrfToken() };
  }

  @Post('/register')
  register(
    @Body() createAuthDto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.register(createAuthDto, response);
  }

  @Post('/login')
  login(
    @Body() createAuthDto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.login(createAuthDto, response);
  }
}
