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
  Req,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { Query } from '@nestjs/common';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { UserType } from 'src/user/enum/user-type.enum';

import { EventoService } from './evento.service';
import { CreateEventoDto } from './dtos/create-evento.dto';
import { UpdateEventoDto } from './dtos/update-evento.dto';
import { UserEntity } from 'src/user/entities/user.entity';
import { StatusEvento } from './enum/eventos-status.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('evento')
export class EventoController {
  constructor(private readonly service: EventoService) {}

  @Patch(':id/status')
  @Roles(UserType.MASTER, UserType.TECNICO, UserType.AUXILIAR, UserType.PD)
  alterarStatus(
    @Param('id') id: number,
    @Body('status') status: StatusEvento,
    @Req() req: any,
  ) {
    return this.service.alterarStatus(id, status, req.user);
  }

  @Get(':id/resumo-escalas')
  @Roles(
    UserType.MASTER,
    UserType.TECNICO,
    UserType.AUXILIAR,
    UserType.DIRETOR,
    UserType.ESTRATEGICO,
    UserType.FINANCEIRO,
    UserType.PD,
  )
  getResumoEscalas(@Param('id', ParseIntPipe) id: number) {
    return this.service.getResumoEscalas(id);
  }

  @Get(':id/pdf')
  @Roles(
    UserType.MASTER,
    UserType.TECNICO,
    UserType.AUXILIAR,
    UserType.DIRETOR,
    UserType.ESTRATEGICO,
    UserType.FINANCEIRO,
    UserType.PD,
  )
  async downloadPdf(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Res() res: any,
  ): Promise<void> {
    const matUsuario: string =
      req.user?.mat ?? req.user?.id?.toString() ?? 'N/A';

    const { buffer, nomeEvento } = await this.service.generatePdf(
      id,
      matUsuario,
    );

    const filename = `EVENTO_${nomeEvento}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @Get(':id/xls-pd')
  @Roles(UserType.MASTER, UserType.TECNICO, UserType.FINANCEIRO)
  async downloadXlsPd(
    @Param('id', ParseIntPipe) id: number,
    @Query('dh') dh: string,
    @Res() res: any,
  ): Promise<void> {
    if (!dh) throw new BadRequestException('Informe o número do DH');

    const { buffer, nomeArquivo } = await this.service.gerarXlsPd(id, dh);

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nomeArquivo}.xlsx"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @Patch(':id/bloqueio')
  @Roles(UserType.MASTER, UserType.TECNICO)
  toggleBloqueio(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.toggleBloqueio(id, req.user as UserEntity);
  }

  @Post()
  @Roles(
    UserType.MASTER,
    UserType.TECNICO,
    UserType.DIRETOR,
    UserType.GESTOR_VERBA,
  )
  create(@Body() dto: CreateEventoDto, @Req() req: any) {
    return this.service.create(dto, req.user as UserEntity);
  }

  @Get()
  @Roles(
    UserType.MASTER,
    UserType.TECNICO,
    UserType.DIRETOR,
    UserType.AUXILIAR,
    UserType.FINANCEIRO,
    UserType.PD,
    UserType.GESTOR_VERBA,
  )
  findAll(
    @Query('distribuicaoId') distribuicaoId?: string,
    @Query('omeId') omeId?: string,
    @Req() req?: any,
  ) {
    return this.service.findAll(
      distribuicaoId ? Number(distribuicaoId) : undefined,
      omeId ? Number(omeId) : undefined,
      req?.user as UserEntity,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles(
    UserType.MASTER,
    UserType.TECNICO,
    UserType.DIRETOR,
    UserType.GESTOR_VERBA,
  )
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEventoDto,
    @Req() req: any,
  ) {
    return this.service.update(id, dto, req.user);
  }

  @Delete(':id')
  @Roles(
    UserType.MASTER,
    UserType.TECNICO,
    UserType.DIRETOR,
    UserType.GESTOR_VERBA,
  )
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.remove(id, req.user);
  }
}
