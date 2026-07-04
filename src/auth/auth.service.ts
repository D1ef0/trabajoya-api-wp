import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compareSync } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

export interface AuthUser {
  id: string;
  username: string;
  email: string | null;
  name: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username.trim() },
    });

    if (!user?.active || !compareSync(dto.password, user.passwordHash)) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const payload = { sub: user.id, username: user.username };
    const accessToken = await this.jwt.signAsync(payload);

    return {
      accessToken,
      user: this.toAuthUser(user),
    };
  }

  async validateUser(userId: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user?.active) {
      return null;
    }

    return this.toAuthUser(user);
  }

  private toAuthUser(user: {
    id: string;
    username: string;
    email: string | null;
    name: string | null;
  }): AuthUser {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
    };
  }
}
