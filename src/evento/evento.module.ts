import { Module } from '@nestjs/common';
import { EventoService } from './evento.service';
import { EventoController } from './evento.controller';

@Module({
  providers: [EventoService],
  controllers: [EventoController]
})
export class EventoModule {}
