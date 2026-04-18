import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
import { ContaService } from './conta.service';
import { CreateContaDto } from './dtos/create-conta.dto';
import { UpdateContaDto } from './dtos/update-conta.dto';

@Controller('conta')
export class ContaController {
  constructor(private readonly service: ContaService) {}

  @Post()
  criar(@Body() dto: CreateContaDto) {
    return this.service.criar(dto);
  }

  @Get('usuario/:usuarioId')
  buscar(@Param('usuarioId') usuarioId: number) {
    return this.service.buscarPorUsuario(usuarioId);
  }

  @Put(':id')
  atualizar(@Param('id') id: number, @Body() dto: UpdateContaDto) {
    return this.service.atualizar(id, dto);
  }

  @Delete(':id')
  remover(@Param('id') id: number) {
    return this.service.remover(id);
  }
}
