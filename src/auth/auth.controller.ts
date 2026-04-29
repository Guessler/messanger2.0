import { Controller, Get, Post, Body, Patch, Param, Delete, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import type { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('/register')
  register(@Body() createAuthDto: RegisterDto, @Res({ passthrough: true }) response: Response) {
    return this.authService.register(createAuthDto, response);
  }

  @Post('/login')
  login(@Body() createAuthDto: RegisterDto, @Res({ passthrough: true }) response: Response) {
    return this.authService.login(createAuthDto, response)
  }


}
