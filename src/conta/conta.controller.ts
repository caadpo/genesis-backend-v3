import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Delete,
  Req,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ContaService } from './conta.service';
import { CreateContaDto } from './dtos/create-conta.dto';
import { UpdateContaDto } from './dtos/update-conta.dto';
import { RolesGuard } from 'src/guards/roles.guard';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('conta')
export class ContaController {
  constructor(private readonly service: ContaService) {}

  @Post()
  criar(@Body() dto: CreateContaDto, @Req() req: any) {
    return this.service.criar(dto, req.user.sub);
  }

  @Get('usuario/:usuarioId')
  buscar(@Param('usuarioId') usuarioId: number) {
    return this.service.buscarPorUsuario(usuarioId);
  }

  @Patch(':id')
  atualizar(
    @Param('id') id: number,
    @Body() dto: UpdateContaDto,
    @Req() req: any,
  ) {
    return this.service.atualizar(id, dto, req.user.id);
  }

  @Delete(':id')
  remover(@Param('id') id: number) {
    return this.service.remover(id);
  }
}
