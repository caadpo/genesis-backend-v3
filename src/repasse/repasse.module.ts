import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { RepasseEntity } from './entities/repasse.entity';
import { EscalaEntity } from 'src/escala/entities/escala.entity';
import { UserEntity } from 'src/user/entities/user.entity';
import { DadosSgpEntity } from 'src/dadossgp/entities/dadossgp.entity';

import { RepasseService } from './repasse.service';
import { RepasseController } from './repasse.controller';

@Module({
  imports: [
    // ✅ ScheduleModule.forRoot() deve estar no AppModule — aqui apenas referenciamos
    TypeOrmModule.forFeature([
      RepasseEntity,
      EscalaEntity,
      UserEntity,
      DadosSgpEntity,
    ]),
  ],
  controllers: [RepasseController],
  providers: [RepasseService],
  exports: [RepasseService],
})
export class RepasseModule {}
