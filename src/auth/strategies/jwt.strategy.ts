import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { UserEntity } from 'src/user/entities/user.entity';
import { ReturnUserDto } from 'src/user/dtos/return-user.dto';
import { DadosSgpEntity } from 'src/dadossgp/entities/dadossgp.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly configService: ConfigService,
    @InjectRepository(DadosSgpEntity)
    private readonly dadosSgpRepo: Repository<DadosSgpEntity>,
  ) {
    const secret = configService.get<string>('JWT_SECRET');

    if (!secret) {
      throw new Error('JWT_SECRET não definido no .env');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    const usuario = await this.userRepo.findOne({
      where: { id: payload.sub },
      relations: { ome: true, conta: true },
    });

    if (!usuario) return null;

    const sgp = await this.dadosSgpRepo.findOne({
      where: { matSgp: usuario.mat },
    });

    // ✅ injeta os dados do SGP no objeto retornado para req.user
    return new ReturnUserDto({
      ...usuario,
      pg: sgp?.pgSgp ?? '',
      nomeGuerra: sgp?.nomeGuerraSgp ?? '',
      tipo: sgp?.tipoSgp ?? '',
      cpf: sgp?.cpfSgp ?? '',
      nunfunc: sgp?.nunfuncSgp ?? '',
      nunvinc: sgp?.nunvincSgp ?? '',
    });
  }
}
