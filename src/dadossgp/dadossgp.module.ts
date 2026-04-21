import { Module } from '@nestjs/common';
import { DadosSgpService } from './dadossgp.service';
import { DadosSgpController } from './dadossgp.controller';
import { DadosSgpEntity } from './entities/dadossgp.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([DadosSgpEntity])],
  providers: [DadosSgpService],
  controllers: [DadosSgpController],
  exports: [DadosSgpService],
})
export class DadossgpModule {}
