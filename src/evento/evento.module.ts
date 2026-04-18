import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EventoService } from './evento.service';
import { EventoController } from './evento.controller';

import { Evento } from './entities/evento.entity';
import { Distribuicao } from 'src/distribuicao/entities/distribuicao.entity';
import { OmeEntity } from 'src/ome/entities/ome.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Evento, Distribuicao, OmeEntity])],
  providers: [EventoService],
  controllers: [EventoController],
})
export class EventoModule {}
