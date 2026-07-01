import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  ParseIntPipe,
  Query,
  UseGuards,
  BadRequestException,
  Request,
} from '@nestjs/common';
import { CreateEscalaDto } from './dtos/create-escala.dto';
import { UpdateEscalaDto } from './dtos/update-escala.dto';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { UserType } from 'src/user/enum/user-type.enum';
import { EscalaService } from './escala.service';

import { Res } from '@nestjs/common';
import type { Response } from 'express';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('escala')
export class EscalaController {
  constructor(private readonly service: EscalaService) {}

  @Get('matricula/:mat')
  findByMatricula(
    @Param('mat') mat: string,
    @Query('sistema') sistema: string,
    @Query('mes') mes?: string,
    @Query('ano') ano?: string,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
  ) {
    if (sistema === 'PJES') {
      if (!mes || !ano) {
        throw new BadRequestException('Para PJES informe mes e ano');
      }
      return this.service.findByMatriculaPjes(mat, Number(mes), Number(ano));
    }

    if (sistema === 'DIARIAS') {
      if (!dataInicio || !dataFim) {
        throw new BadRequestException(
          'Para DIARIAS informe dataInicio e dataFim',
        );
      }
      return this.service.findByMatriculaDiarias(mat, dataInicio, dataFim);
    }

    throw new BadRequestException('Sistema inválido. Use PJES ou DIARIAS');
  }

  @Get()
  @Roles(
    UserType.MASTER,
    UserType.TECNICO,
    UserType.DIRETOR,
    UserType.AUXILIAR,
    UserType.FINANCEIRO,
    UserType.PD,
    UserType.COMUN,
  )
  findAll(@Query('operacaoId') operacaoId?: string) {
    return this.service.findByOperacao(Number(operacaoId));
  }

  @Get('cod-op/:codOp')
  @Roles(
    UserType.MASTER,
    UserType.TECNICO,
    UserType.AUXILIAR,
    UserType.DIRETOR,
    UserType.ESTRATEGICO,
    UserType.FINANCEIRO,
    UserType.PD,
    UserType.COMUN,
  )
  findByCodOp(@Param('codOp') codOp: string) {
    return this.service.findByCodOp(codOp);
  }

  @Get('pdf')
  @Roles(
    UserType.MASTER,
    UserType.TECNICO,
    UserType.DIRETOR,
    UserType.AUXILIAR,
    UserType.FINANCEIRO,
    UserType.PD,
    UserType.COMUN,
  )
  async downloadPdf(
    @Query('operacaoId') operacaoId: string,
    @Request() req: any,
    @Res() res: Response,
  ): Promise<void> {
    if (!operacaoId) {
      throw new BadRequestException('Informe o operacaoId');
    }

    const matUsuario: string =
      req.user?.mat ?? req.user?.id?.toString() ?? 'N/A';
    const { buffer, cod_op } = await this.service.generatePdf(
      Number(operacaoId),
      matUsuario,
    );

    const filename = `COP_${cod_op}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @Patch(':id/presenca')
  @Roles(
    UserType.MASTER,
    UserType.TECNICO,
    UserType.AUXILIAR,
    UserType.DIRETOR,
    UserType.ESTRATEGICO,
    UserType.FINANCEIRO,
    UserType.PD,
    UserType.COMUN,
    UserType.GESTOR_VERBA,
  )
  confirmarPresenca(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { confirmado: boolean; observacao?: string },
    @Request() req: any,
  ) {
    console.log('req.user:', req.user); // 👈 debug temporário
    return this.service.confirmarPresenca(
      id,
      body.confirmado,
      body.observacao,
      req.user,
    );
  }

  @Get('minhas')
  @Roles(
    UserType.MASTER,
    UserType.TECNICO,
    UserType.AUXILIAR,
    UserType.DIRETOR,
    UserType.ESTRATEGICO,
    UserType.FINANCEIRO,
    UserType.PD,
    UserType.COMUN,
  )
  findMinhas(@Request() req: any) {
    return this.service.findMinhasEscalas(req.user);
  }

  @Get('usuario/:usuarioId')
  @Roles(UserType.MASTER, UserType.TECNICO, UserType.DIRETOR, UserType.AUXILIAR)
  findByUsuario(
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @Query('sistema') sistema: string,
    @Request() req: any,
  ) {
    return this.service.findEscalasByUsuario(usuarioId, sistema, req.user);
  }

  @Get(':id')
  @Roles(
    UserType.MASTER,
    UserType.TECNICO,
    UserType.AUXILIAR,
    UserType.DIRETOR,
    UserType.ESTRATEGICO,
    UserType.FINANCEIRO,
    UserType.PD,
    UserType.COMUN,
  )
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(UserType.MASTER, UserType.TECNICO, UserType.AUXILIAR)
  create(@Body() dto: CreateEscalaDto, @Request() req: any) {
    return this.service.create(dto, req.user); // ✅ passa o usuário logado
  }

  @Patch(':id')
  @Roles(UserType.MASTER, UserType.TECNICO, UserType.AUXILIAR)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEscalaDto,
    @Request() req: any,
  ) {
    return this.service.update(id, dto, req.user); // ✅ passa o usuário logado
  }

  @Delete(':id')
  @Roles(UserType.MASTER, UserType.TECNICO, UserType.AUXILIAR)
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.remove(id, req.user); // ✅ passa o usuário logado
  }
}
