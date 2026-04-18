// src/user/user.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserEntity } from './entities/user.entity';
import { OmeEntity } from 'src/ome/entities/ome.entity';
import { ContaEntity } from 'src/conta/entities/conta.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, OmeEntity, ContaEntity])],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
