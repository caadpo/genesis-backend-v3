import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Distribuicao } from './entities/distribuicao.entity';
import { DistribuicaoService } from './distribuicao.service';
import { DistribuicaoController } from './distribuicao.controller';

import { Teto } from 'src/tetos/entities/teto.entity';
import { DiretoriaEntity } from 'src/diretoria/entities/diretoria.entity';
import { UserEntity } from 'src/user/entities/user.entity';
import { EscalaEntity } from 'src/escala/entities/escala.entity';
import { Evento } from 'src/evento/entities/evento.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Distribuicao,
      Teto,
      DiretoriaEntity,
      UserEntity,
      EscalaEntity,
      Evento,
    ]),
  ],
  controllers: [DistribuicaoController],
  providers: [DistribuicaoService],
})
export class DistribuicaoModule {}
