import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TetosController } from './teto.controller';
import { TetoService } from './teto.service';
import { Teto } from './entities/teto.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Teto])],
  controllers: [TetosController],
  providers: [TetoService],
})
export class TetosModule {}
