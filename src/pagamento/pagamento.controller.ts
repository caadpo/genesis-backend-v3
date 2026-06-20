import {
  Controller,
  Post,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
  Query,
  Patch,
  Body,
} from '@nestjs/common';
import { PagamentoService } from './pagamento.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { UserType } from 'src/user/enum/user-type.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pagamento')
export class PagamentoController {
  constructor(private readonly service: PagamentoService) {}

  // ✅ Gera os registros de pagamento a partir das escalas do evento
  @Post('evento/:eventoId')
  @Roles(UserType.MASTER, UserType.TECNICO, UserType.FINANCEIRO, UserType.PD)
  gerar(@Param('eventoId', ParseIntPipe) eventoId: number) {
    return this.service.gerarPagamentos(eventoId);
  }

  // ✅ Lista pagamentos de um evento
  @Get('evento/:eventoId')
  @Roles(
    UserType.MASTER,
    UserType.TECNICO,
    UserType.FINANCEIRO,
    UserType.PD,
    UserType.DIRETOR,
    UserType.ESTRATEGICO,
  )
  findByEvento(@Param('eventoId', ParseIntPipe) eventoId: number) {
    return this.service.findByEvento(eventoId);
  }

  @Get('eventos')
  @Roles(
    UserType.MASTER,
    UserType.TECNICO,
    UserType.FINANCEIRO,
    UserType.PD,
    UserType.DIRETOR,
    UserType.ESTRATEGICO,
    UserType.AUXILIAR,
    UserType.COMUN,
  )
  findEventosPagos(@Query('limit') limit?: string) {
    return this.service.findEventosPagos(limit ? Number(limit) : undefined);
  }

  @Get('evento/:eventoId/paginado')
  @Roles(
    UserType.MASTER,
    UserType.TECNICO,
    UserType.FINANCEIRO,
    UserType.PD,
    UserType.DIRETOR,
  )
  findByEventoPaginado(
    @Param('eventoId', ParseIntPipe) eventoId: number,
    @Query('page') page?: string,
    @Query('busca') busca?: string,
  ) {
    return this.service.findByEventoPaginado(
      eventoId,
      page ? Number(page) : 1,
      busca,
    );
  }

  @Patch(':id')
  @Roles(UserType.MASTER, UserType.TECNICO, UserType.FINANCEIRO)
  atualizarPagamento(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { pgtrue: boolean; comentario_pagamento: string },
  ) {
    return this.service.atualizarPagamento(
      id,
      body.pgtrue,
      body.comentario_pagamento,
    );
  }

  // ✅ Lista todos os pagamentos
  @Get()
  @Roles(UserType.MASTER, UserType.FINANCEIRO, UserType.PD, UserType.DIRETOR)
  findAll() {
    return this.service.findAll();
  }

  // ✅ Busca um pagamento por ID
  @Get(':id')
  @Roles(UserType.MASTER, UserType.FINANCEIRO, UserType.PD, UserType.DIRETOR)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }
}
