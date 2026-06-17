import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DadosSgpEntity } from './entities/dadossgp.entity';
import { DadosSgpService } from './dadossgp.service';
import { DadosSgpController } from './dadossgp.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DadosSgpEntity])],
  providers: [DadosSgpService],
  controllers: [DadosSgpController],
  exports: [DadosSgpService],
})
export class DadosSgpModule {}
