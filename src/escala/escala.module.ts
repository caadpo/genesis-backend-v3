import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EscalaEntity } from './entities/escala.entity';
import { EscalaService } from './escala.service';
import { EscalaController } from './escala.controller';
import { UserEntity } from 'src/user/entities/user.entity';
import { Operacao } from 'src/operacao/entities/operacao.entity';
import { Evento } from 'src/evento/entities/evento.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([EscalaEntity, UserEntity, Operacao, Evento]),
  ],
  controllers: [EscalaController],
  providers: [EscalaService],
})
export class EscalaModule {}
