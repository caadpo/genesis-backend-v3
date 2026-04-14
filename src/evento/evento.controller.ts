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
} from '@nestjs/common';

import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { UserType } from 'src/user/enum/user-type.enum';

import { EventoService } from './evento.service';
import { CreateEventoDto } from './dtos/create-evento.dto';
import { UpdateEventoDto } from './dtos/update-evento.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('evento')
export class EventoController {
  constructor(private readonly service: EventoService) {}

  @Post()
  @Roles(UserType.MASTER, UserType.TECNICO)
  create(@Body() dto: CreateEventoDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles(UserType.MASTER, UserType.TECNICO)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEventoDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserType.MASTER, UserType.TECNICO)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
