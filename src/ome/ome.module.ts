import { Module } from '@nestjs/common';
import { OmeService } from './ome.service';
import { OmeController } from './ome.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OmeEntity } from './entities/ome.entity';
import { DiretoriaEntity } from 'src/diretoria/entities/diretoria.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OmeEntity, DiretoriaEntity])],
  providers: [OmeService],
  controllers: [OmeController],
})
export class OmeModule {}
