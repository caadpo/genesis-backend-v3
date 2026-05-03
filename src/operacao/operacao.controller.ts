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
  Request,
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
  @Roles(UserType.AUXILIAR, UserType.TECNICO, UserType.MASTER)
  create(@Body() dto: CreateOperacaoDto, @Request() req: any) {
    return this.service.create(dto, req.user); // ✅ passa o usuário autenticado
  }

  @Get()
  findAll(@Query('eventoId') eventoId?: string) {
    return this.service.findAll(eventoId ? Number(eventoId) : undefined);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles(UserType.AUXILIAR, UserType.TECNICO, UserType.MASTER)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOperacaoDto,
    @Request() req: any,
  ) {
    return this.service.update(id, dto, req.user); // ✅ passa o usuário autenticado
  }

  @Delete(':id')
  @Roles(UserType.AUXILIAR, UserType.TECNICO, UserType.MASTER)
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.remove(id, req.user); // ✅ passa o usuário autenticado
  }
}
