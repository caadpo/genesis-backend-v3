import { Module } from '@nestjs/common';
import { OperacaoService } from './operacao.service';
import { OperacaoController } from './operacao.controller';

@Module({
  providers: [OperacaoService],
  controllers: [OperacaoController]
})
export class OperacaoModule {}
