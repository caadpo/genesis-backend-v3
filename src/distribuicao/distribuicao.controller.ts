// src/distribuicao/distribuicao.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  ParseIntPipe,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';

import type { Request } from 'express';

import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { UserType } from 'src/user/enum/user-type.enum';

import { DistribuicaoService } from './distribuicao.service';
import { CreateDistribuicaoDto } from './dtos/create-distribuicao.dto';
import { UserEntity } from 'src/user/entities/user.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('distribuicao')
export class DistribuicaoController {
  constructor(private readonly service: DistribuicaoService) {}

  @Post()
  @Roles(UserType.MASTER, UserType.TECNICO)
  create(@Body() dto: CreateDistribuicaoDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query('tetoId') tetoId: string, @Req() req: Request) {
    return this.service.findAllComRegra(
      tetoId ? Number(tetoId) : undefined,
      req.user as UserEntity,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles(UserType.MASTER, UserType.TECNICO)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateDistribuicaoDto>,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserType.MASTER, UserType.TECNICO)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
