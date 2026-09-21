import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthUser } from '../../../common/decorators/current-user.decorator';
import { staffTokenOptionsFromEnv } from '../staff-token.service';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  name?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    // Same rules as StaffTokenService.verifyAccess: pinned algorithm, issuer
    // and the admin audience. RS256 public key when configured, HS256 in dev.
    const o = staffTokenOptionsFromEnv(process.env, config.get<string>('jwt.secret'));
    const keyPair = !!(o.publicKey || o.privateKey);
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: keyPair ? (o.publicKey ?? o.privateKey) : o.hsSecret,
      algorithms: [keyPair ? 'RS256' : 'HS256'],
      issuer: o.issuer,
      audience: o.audience[0],
    });
  }

  /** Return value is attached to request.user. */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    return { id: payload.sub, email: payload.email, role: payload.role, name: payload.name };
  }
}
