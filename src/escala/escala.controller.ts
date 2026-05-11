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
  Request, // ✅ adicionar
} from '@nestjs/common';
import { CreateEscalaDto } from './dtos/create-escala.dto';
import { UpdateEscalaDto } from './dtos/update-escala.dto';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { UserType } from 'src/user/enum/user-type.enum';
import { EscalaService } from './escala.service';

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
    UserType.AUXILIAR,
    UserType.DIRETOR,
    UserType.ESTRATEGICO,
    UserType.FINANCEIRO,
    UserType.PD,
  )
  findAll(@Query('operacaoId') operacaoId?: string) {
    return this.service.findByOperacao(Number(operacaoId));
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
  )
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(
    UserType.MASTER,
    UserType.TECNICO,
    UserType.AUXILIAR,
    UserType.FINANCEIRO,
  )
  create(@Body() dto: CreateEscalaDto, @Request() req: any) {
    return this.service.create(dto, req.user); // ✅ passa o usuário logado
  }

  @Patch(':id')
  @Roles(
    UserType.MASTER,
    UserType.TECNICO,
    UserType.AUXILIAR,
    UserType.FINANCEIRO,
  )
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEscalaDto,
    @Request() req: any,
  ) {
    return this.service.update(id, dto, req.user); // ✅ passa o usuário logado
  }

  @Delete(':id')
  @Roles(
    UserType.MASTER,
    UserType.TECNICO,
    UserType.AUXILIAR,
    UserType.FINANCEIRO,
  )
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.remove(id, req.user); // ✅ passa o usuário logado
  }
}
