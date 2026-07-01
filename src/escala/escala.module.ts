// src/escala/escala.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EscalaEntity } from './entities/escala.entity';
import { EscalaService } from './escala.service';
import { EscalaController } from './escala.controller';
import { UserEntity } from 'src/user/entities/user.entity';
import { Operacao } from 'src/operacao/entities/operacao.entity';
import { Evento } from 'src/evento/entities/evento.entity';
import { DadosSgpEntity } from 'src/dadossgp/entities/dadossgp.entity'; // ✅ adicionar
import { ViaturaEntity } from 'src/viatura/entities/viatura.entity';
import { PagamentoEntity } from 'src/pagamento/entities/pagamento.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EscalaEntity,
      UserEntity,
      Operacao,
      Evento,
      DadosSgpEntity,
      ViaturaEntity,
      PagamentoEntity,
    ]),
  ],
  controllers: [EscalaController],
  providers: [EscalaService],
})
export class EscalaModule {}
