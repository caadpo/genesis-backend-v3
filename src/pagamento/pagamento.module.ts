import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PagamentoEntity } from './entities/pagamento.entity';
import { PagamentoService } from './pagamento.service';
import { PagamentoController } from './pagamento.controller';
import { EscalaEntity } from 'src/escala/entities/escala.entity';
import { Evento } from 'src/evento/entities/evento.entity';
import { Teto } from 'src/tetos/entities/teto.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PagamentoEntity, EscalaEntity, Evento, Teto]),
  ],
  controllers: [PagamentoController],
  providers: [PagamentoService],
})
export class PagamentoModule {}
