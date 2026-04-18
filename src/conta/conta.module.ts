// src/conta/conta.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContaService } from './conta.service';
import { ContaController } from './conta.controller';
import { ContaEntity } from './entities/conta.entity';
import { UserEntity } from 'src/user/entities/user.entity';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([ContaEntity, UserEntity]), UserModule],
  providers: [ContaService],
  controllers: [ContaController],
})
export class ContaModule {}
