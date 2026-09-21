import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { StaffTokenService, staffTokenOptionsFromEnv } from './staff-token.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [UsersModule, PassportModule, JwtModule.register({}), ConfigModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    {
      // The website is the ISSUER: it holds the private key (JWT_PRIVATE_KEY).
      // JWT_SECRET is only the HS256 fallback for local development.
      provide: StaffTokenService,
      inject: [JwtService, ConfigService],
      useFactory: (jwt: JwtService, config: ConfigService) =>
        new StaffTokenService(jwt, staffTokenOptionsFromEnv(process.env, config.get<string>('jwt.secret'))),
    },
  ],
  exports: [StaffTokenService],
})
export class AuthModule {}
