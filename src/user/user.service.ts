import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UpdateUserDto } from './dto/update-user.dto';

type JwtPayload = {
  sub: string;
};
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async profile(token: string) {
    if (!token) {
      throw new UnauthorizedException();
    }

    const payload = this.jwtService.verify<JwtPayload>(token, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
    });

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatar: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }

  async updateProfile(token: string, dto: UpdateUserDto) {
    if (!token) {
      throw new UnauthorizedException();
    }

    const payload = this.jwtService.verify<JwtPayload>(token, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
    });

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    await this.userRepository.update(
      { id: user.id },
      {
        name: dto.name ?? user.name,
        username: dto.username ?? user.username,
        avatar: dto.avatar ?? user.avatar,
      },
    );

    return { success: 'ok' };
  }

  async deleteAccount(token: string) {
    if (!token) {
      throw new UnauthorizedException();
    }

    const payload = this.jwtService.verify<JwtPayload>(token, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
    });

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    await this.userRepository.softDelete({ id: user.id });
    await this.userRepository.update(user.id, {
      refreshToken: null,
    });

    return { message: 'Account deleted' };
  }
}
