import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Aviso } from './entities/aviso.entity';
import { AvisosController } from './aviso.controller';
import { AvisosService } from './aviso.service';

// Se o TetosModule importa algo extra para os guards funcionarem
// (ex: UserModule, JwtModule), importe o mesmo aqui.
@Module({
  imports: [TypeOrmModule.forFeature([Aviso])],
  controllers: [AvisosController],
  providers: [AvisosService],
  exports: [AvisosService],
})
export class AvisosModule {}
