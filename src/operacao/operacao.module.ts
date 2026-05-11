import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OperacaoService } from './operacao.service';
import { OperacaoController } from './operacao.controller';

import { Operacao } from './entities/operacao.entity';
import { Evento } from 'src/evento/entities/evento.entity';
import { OmeEntity } from 'src/ome/entities/ome.entity';
import { UserEntity } from 'src/user/entities/user.entity';
import { EscalaEntity } from 'src/escala/entities/escala.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Operacao,
      Evento,
      EscalaEntity,
      OmeEntity,
      UserEntity,
    ]),
  ],
  providers: [OperacaoService],
  controllers: [OperacaoController],
})
export class OperacaoModule {}
