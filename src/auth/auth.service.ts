// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { validatePassword } from 'src/utils/password';
import { UserService } from '../user/user.service';
import { LoginDto } from './dtos/login.dto';
import { LoginPayload } from './dtos/loginPayload.dto';
import { ReturnUserDto } from 'src/user/dtos/return-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.userService.findUserByLoginSei(loginDto.loginSei);

    if (!user) {
      throw new UnauthorizedException('Login ou senha inválidos');
    }

    const isMatch = await validatePassword(loginDto.password, user.password);

    if (!isMatch) {
      throw new UnauthorizedException('Login ou senha inválidos');
    }

    const payload = new LoginPayload(user);
    const accessToken = this.jwtService.sign({ ...payload });

    return {
      accessToken,
      user: new ReturnUserDto(user),
    };
  }
}
