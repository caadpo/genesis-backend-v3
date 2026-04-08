import { Module } from '@nestjs/common';
import { DiretoriaService } from './diretoria.service';
import { DiretoriaController } from './diretoria.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiretoriaEntity } from './entities/diretoria.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DiretoriaEntity])],
  providers: [DiretoriaService],
  controllers: [DiretoriaController],
})
export class DiretoriaModule {}
