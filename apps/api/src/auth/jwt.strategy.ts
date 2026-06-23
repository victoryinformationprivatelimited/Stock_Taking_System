import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RequestUser } from '../common/tenant-context';

export interface JwtPayload {
  sub: string;
  tenantId: string;
  role: 'MANAGER' | 'COUNTER';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET'),
    });
  }

  validate(payload: JwtPayload): RequestUser {
    return { userId: payload.sub, tenantId: payload.tenantId, role: payload.role };
  }
}
