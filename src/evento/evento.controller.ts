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
  Req,
} from '@nestjs/common';
import { Query } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { UserType } from 'src/user/enum/user-type.enum';

import { EventoService } from './evento.service';
import { CreateEventoDto } from './dtos/create-evento.dto';
import { UpdateEventoDto } from './dtos/update-evento.dto';
import { UserEntity } from 'src/user/entities/user.entity';
import { StatusEvento } from './enum/eventos-status.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('evento')
export class EventoController {
  constructor(private readonly service: EventoService) {}

  @Patch(':id/status')
  @Roles(UserType.MASTER, UserType.TECNICO, UserType.AUXILIAR, UserType.PD)
  alterarStatus(
    @Param('id') id: number,
    @Body('status') status: StatusEvento,
    @Req() req,
  ) {
    return this.service.alterarStatus(id, status, req.user);
  }

  @Post()
  @Roles(UserType.MASTER, UserType.TECNICO, UserType.DIRETOR)
  create(@Body() dto: CreateEventoDto, @Req() req: Request) {
    return this.service.create(dto, req.user as UserEntity);
  }

  // evento.controller.ts
  @Get()
  findAll(@Query('distribuicaoId') distribuicaoId?: string) {
    return this.service.findAll(
      distribuicaoId ? Number(distribuicaoId) : undefined,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles(UserType.MASTER, UserType.TECNICO, UserType.DIRETOR)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEventoDto,
    @Req() req,
  ) {
    return this.service.update(id, dto, req.user);
  }

  @Delete(':id')
  @Roles(UserType.MASTER, UserType.TECNICO, UserType.DIRETOR)
  remove(@Param('id', ParseIntPipe) id: number, @Req() req) {
    return this.service.remove(id, req.user);
  }
}
