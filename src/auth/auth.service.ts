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
import { UpdateAuthDto } from './dto/update-auth.dto';
import { S3Service } from 'src/s3/s3.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private s3Service: S3Service,
  ) {}

  async register(
    registerDto: RegisterDto,
    // file: Express.Multer.File | undefined,
    response: Response,
  ) {
    const existUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existUser) {
      throw new ConflictException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 7);

    const user = this.userRepository.create({
      ...registerDto,
      password: hashedPassword,
      name: 'Anonymous',
      username: `user_${uuidv4()}`,
    });

    const savedUser = await this.userRepository.save(user);

    // let avatarKey: string | null = null;

    // if (file) {
    //   avatarKey = `avatars/${savedUser.id}`;

    //   await this.s3Service.uploadAvatar(avatarKey, file.buffer, file.mimetype);

    //   savedUser.avatarKey = avatarKey;
    //   await this.userRepository.save(savedUser);
    // }

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

  async me(access_token: string) {
    if (!access_token) {
      throw new UnauthorizedException();
    }

    const payload = this.jwtService.verify<JwtPayload>(access_token, {
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

  async changePassword(
    access_token: string,
    dto: UpdateAuthDto,
    res: Response,
  ) {
    if (!access_token) {
      throw new UnauthorizedException();
    }

    const payload = this.jwtService.verify<JwtPayload>(access_token, {
      secret: process.env.JWT_ACCESS_SECRET,
    });

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    const isValid = await bcrypt.compare(dto.oldPassword, user.password);

    if (!isValid) {
      throw new UnauthorizedException('Invalid current password');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 7);

    user.password = hashedPassword;

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

    return {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
    };
  }

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

  async logout(access_token: string, res: Response) {
    if (!access_token) {
      throw new UnauthorizedException();
    }

    const payload = this.jwtService.verify<JwtPayload>(access_token, {
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
