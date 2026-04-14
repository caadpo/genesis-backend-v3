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

import { OperacaoService } from './operacao.service';
import { CreateOperacaoDto } from './dtos/create-operacao.dto';
import { UpdateOperacaoDto } from './dtos/update-operacao.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('operacao')
export class OperacaoController {
  constructor(private readonly service: OperacaoService) {}

  @Post()
  @Roles(UserType.MASTER, UserType.TECNICO)
  create(@Body() dto: CreateOperacaoDto) {
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
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOperacaoDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserType.MASTER, UserType.TECNICO)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
