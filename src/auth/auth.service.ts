import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { User } from '../user/entities/user.entity';
import { JwtPayload } from 'src/shared/jwt-payload';
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto, response: Response) {
    const existUser = await this.userRepository.findOne({
      where: [{ email: registerDto.email }, { username: registerDto.username }],
    });

    if (existUser) {
      throw new ConflictException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 7);

    const user = this.userRepository.create({
      ...registerDto,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(user);

    const payload = {
      sub: savedUser.id,
      username: savedUser.username,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: '15m',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });
    this.setAuthCookies(response, accessToken, refreshToken);

    savedUser.refreshToken = refreshToken;
    await this.userRepository.save(savedUser);

    const { password, refreshToken: _, ...userWithoutSensitive } = savedUser;

    return {
      user: userWithoutSensitive,
    };
  }

  async login(loginDto: LoginDto, response: Response) {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new ConflictException('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      username: user.username,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: '15m',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });

    this.setAuthCookies(response, accessToken, refreshToken);

    user.refreshToken = refreshToken;
    await this.userRepository.save(user);

    const { password, refreshToken: _, ...userWithoutSensitive } = user;

    return {
      user: userWithoutSensitive,
    };
  }

  async me(authHeader: string) {
    const token = authHeader?.split(' ')[1];

    if (!token) {
      throw new UnauthorizedException();
    }

    const payload = this.jwtService.verify<JwtPayload>(token, {
      secret: process.env.JWT_ACCESS_SECRET,
    });

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
    };
  }

  async changePassword(token: string, response: Response) {}

  async refresh(token: string, response: Response) {
    if (!token) {
      throw new UnauthorizedException();
    }

    const payload = this.jwtService.verify<JwtPayload>(token, {
      secret: process.env.JWT_REFRESH_SECRET,
    });

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    if (token !== user.refreshToken) {
      throw new UnauthorizedException();
    }

    const payloadData = { sub: user.id, username: user.username };

    const accessToken = await this.jwtService.signAsync(payloadData, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: '15m',
    });

    const newRefreshToken = await this.jwtService.signAsync(payloadData, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });
    this.setAuthCookies(response, accessToken, newRefreshToken);

    user.refreshToken = newRefreshToken;
    await this.userRepository.save(user);

    return { success: true };
  }

  async logout(authHeader: string, res: Response) {
    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new UnauthorizedException();
    }

    const payload = this.jwtService.verify<JwtPayload>(token, {
      secret: process.env.JWT_ACCESS_SECRET,
    });

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    user.refreshToken = null;
    await this.userRepository.save(user);

    res.clearCookie('access_token', {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'lax',
    });

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'lax',
    });

    return { success: true };
  }

  async logoutAll(token: string, response: Response) {}

  private setAuthCookies(
    response: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    const isProd = this.configService.get('NODE_ENV') === 'production';

    response.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      maxAge: 15 * 60 * 1000,
    });

    response.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}
