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
  Put,
  Request,
} from '@nestjs/common';

import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { UserType } from 'src/user/enum/user-type.enum';

import { OperacaoService } from './operacao.service';
import { CreateOperacaoDto } from './dtos/create-operacao.dto';
import { UpdateOperacaoDto } from './dtos/update-operacao.dto';
import { UpdateCodOpDto } from './dtos/update-cod-op.dto';
import { SetCompartilhamentoDto } from './dtos/set-compartilhamento.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('operacao')
export class OperacaoController {
  constructor(private readonly service: OperacaoService) {}

  @Patch(':id/cod-op')
  @Roles(UserType.AUXILIAR, UserType.TECNICO, UserType.MASTER)
  updateCodOp(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCodOpDto,
    @Request() req: any,
  ) {
    return this.service.updateCodOp(id, dto.cod_op, req.user);
  }

  @Post()
  @Roles(UserType.AUXILIAR, UserType.TECNICO, UserType.MASTER)
  create(@Body() dto: CreateOperacaoDto, @Request() req: any) {
    return this.service.create(dto, req.user); // ✅ passa o usuário autenticado
  }

  @Get()
  findAll(
    @Request() req: any,
    @Query('eventoId') eventoId?: string,
    @Query('mes') mes?: string,
    @Query('ano') ano?: string,
    @Query('compartilhadasComigo') compartilhadasComigo?: string,
  ) {
    return this.service.findAll(
      eventoId ? Number(eventoId) : undefined,
      mes ? Number(mes) : undefined,
      ano ? Number(ano) : undefined,
      compartilhadasComigo === 'true' ? Number(req.user.omeId) : undefined,
    );
  }

  @Get(':id/compartilhamento')
  getCompartilhamento(@Param('id', ParseIntPipe) id: number) {
    return this.service.getCompartilhamento(id);
  }

  @Put(':id/compartilhamento')
  @Roles(UserType.AUXILIAR, UserType.TECNICO, UserType.MASTER)
  setCompartilhamento(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetCompartilhamentoDto,
    @Request() req: any,
  ) {
    return this.service.setCompartilhamento(id, dto.omeIds, req.user);
  }

  @Get('compartilhadas-comigo')
  findCompartilhadasComigo(@Request() req: any) {
    return this.service.findCompartilhadasComigo(Number(req.user.omeId));
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
    return this.service.remove(id, req.user);
  }
}
