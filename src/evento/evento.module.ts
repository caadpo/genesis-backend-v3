import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EventoService } from './evento.service';
import { EventoController } from './evento.controller';

import { Evento } from './entities/evento.entity';
import { Distribuicao } from 'src/distribuicao/entities/distribuicao.entity';
import { OmeEntity } from 'src/ome/entities/ome.entity';
import { UserEntity } from 'src/user/entities/user.entity';
import { EscalaEntity } from 'src/escala/entities/escala.entity';
import { DadosSgpEntity } from 'src/dadossgp/entities/dadossgp.entity';
import { Operacao } from 'src/operacao/entities/operacao.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Evento,
      Distribuicao,
      Operacao,
      OmeEntity,
      UserEntity,
      EscalaEntity,
      DadosSgpEntity,
    ]),
  ],
  providers: [EventoService],
  controllers: [EventoController],
})
export class EventoModule {}
