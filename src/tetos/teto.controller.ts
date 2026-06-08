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
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { UserType } from 'src/user/enum/user-type.enum';
import { TetoService } from './teto.service';
import { Teto } from './entities/teto.entity';
import { ReturnTetoDto } from './dtos/return-teto.dto';
import { CreateTetoDto } from './dtos/create-teto.dto';
import { UpdateTetoDto } from './dtos/update-teto.dto';
import { StatusTeto } from './enum/teto-type.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tetos')
export class TetosController {
  constructor(private readonly tetoService: TetoService) {}

  @Post()
  @Roles(UserType.MASTER)
  create(@Body() dto: CreateTetoDto): Promise<Teto> {
    return this.tetoService.create(dto);
  }

  @Get('pjes')
  @Roles(
    UserType.AUXILIAR,
    UserType.GESTOR_VERBA,
    UserType.DIRETOR,
    UserType.ESTRATEGICO,
    UserType.TECNICO,
    UserType.MASTER,
  )
  findPjes(
    @Query('mes') mes: number,
    @Query('ano') ano: number,
  ): Promise<ReturnTetoDto[]> {
    return this.tetoService.findPjesPorMes(Number(mes), Number(ano));
  }

  // 🟢 DIÁRIAS
  @Get('diarias')
  @Roles(
    UserType.AUXILIAR,
    UserType.DIRETOR,
    UserType.ESTRATEGICO,
    UserType.FINANCEIRO,
    UserType.PD,
    UserType.TECNICO,
    UserType.MASTER,
  )
  findDiarias(@Query('status') status?: string): Promise<ReturnTetoDto[]> {
    const statusFiltro =
      status === 'ENCERRADO' ? StatusTeto.ENCERRADO : StatusTeto.ABERTO;
    return this.tetoService.findDiarias(statusFiltro);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<ReturnTetoDto> {
    return this.tetoService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserType.MASTER)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTetoDto,
  ): Promise<Teto> {
    return this.tetoService.update(id, dto);
  }

  @Patch(':id/encerrar')
  @Roles(UserType.MASTER)
  encerrar(@Param('id', ParseIntPipe) id: number): Promise<Teto> {
    return this.tetoService.encerrar(id);
  }

  @Delete(':id')
  @Roles(UserType.MASTER)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.tetoService.remove(id);
  }

  @Get(':id/xls-escalas')
  @Roles(UserType.MASTER)
  async downloadXlsEscalas(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, nomeArquivo } = await this.tetoService.gerarXlsEscalas(id);

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nomeArquivo}.xlsx"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }
}
