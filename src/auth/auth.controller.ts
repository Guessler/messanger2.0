import { Controller, Post, Body, Res, Get, Req, Patch } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/auth.dto';
import type { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { UpdateAuthDto } from './dto/update-auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('csrf-token')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  getCsrf(@Req() req: Request) {
    return { csrfToken: req.csrfToken() };
  }

  @Post('/register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  register(
    @Body() createAuthDto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.register(createAuthDto, response);
  }

  @Post('/login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  login(
    @Body() createAuthDto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.login(createAuthDto, response);
  }

  @Get('/me')
  me(@Req() req: Request) {
    return this.authService.me(req.cookies?.access_token);
  }

  @Patch('/change-password')
  changePassword(
    @Req() req: Request,
    @Body() dto: UpdateAuthDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.changePassword(
      req.cookies?.access_token,
      dto,
      response,
    );
  }

  @Post('/logout')
  logout(@Req() req: Request, @Res({ passthrough: true }) response: Response) {
    return this.authService.logout(req.cookies?.access_token, response);
  }

  @Post('/refresh')
  refresh(@Req() req: Request, @Res({ passthrough: true }) response: Response) {
    return this.authService.refresh(req.cookies?.refresh_token, response);
  }
}
