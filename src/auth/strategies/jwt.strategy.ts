import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        '3f9b2e8c6a1d4f7b9e0c2a5d8f6b1c3e9a7d2f4b6c8e1a0d9f3b5c7e2a4d6f8',
    });
  }

  async validate(payload: any) {
    return payload;
  }
}
