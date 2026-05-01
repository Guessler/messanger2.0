import {
  Controller,
  Post,
  Body,
  Res,
  Get,
  Req,
  Headers,
  Put,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/auth.dto';
import type { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';

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
  me(@Headers('authorization') authHeader: string) {
    return this.authService.me(authHeader);
  }

  @Put('/change-password')
  changePassword(
    @Res({ passthrough: true }) response: Response,
    @Headers('authorization') authHeader: string,
  ) {
    return this.authService.changePassword(authHeader, response);
  }

  @Post('/logout')
  logout(
    @Res({ passthrough: true }) response: Response,
    @Headers('authorization') authHeader: string,
  ) {
    return this.authService.logout(authHeader, response);
  }

  @Post('/logout-all')
  logoutAll(
    @Res({ passthrough: true }) response: Response,
    @Headers('authorization') authHeader: string,
  ) {
    return this.authService.logoutAll(authHeader, response);
  }

  @Post('/refresh')
  refresh(@Req() req: Request, @Res({ passthrough: true }) response: Response) {
    return this.authService.refresh(req.cookies?.refresh_token, response);
  }
}
