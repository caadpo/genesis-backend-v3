import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ViaturaEntity } from './entities/viatura.entity';
import { ViaturaService } from './viatura.service';
import { ViaturaController } from './viatura.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ViaturaEntity])],
  controllers: [ViaturaController],
  providers: [ViaturaService],
  exports: [ViaturaService],
})
export class ViaturaModule {}
