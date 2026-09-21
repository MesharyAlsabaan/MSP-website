import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { StaffTokenService } from './staff-token.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.users.findByEmailWithPassword(dto.email);
    if (!user || !user.active) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokens(user.id, user.email, user.role, {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
      const user = await this.users.findOne(payload.sub);
      return this.issueTokens(user.id, user.email, user.role, {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async issueTokens(
    sub: string,
    email: string,
    role: string,
    user: Record<string, unknown>,
  ) {
    const payload = { sub, email, role, name: String(user.name ?? '') };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('jwt.secret'),
        expiresIn: this.config.get<string>('jwt.expiresIn'),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: this.config.get<string>('jwt.refreshExpiresIn'),
      }),
    ]);
    return { accessToken, refreshToken, user };
  }
}
