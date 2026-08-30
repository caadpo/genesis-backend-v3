import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { RepasseService } from './repasse.service';
import { CreateRepasseDto } from './dtos/create-repasse.dto';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { UserType } from 'src/user/enum/user-type.enum';

const TODOS_TIPOS = [
  UserType.MASTER,
  UserType.TECNICO,
  UserType.AUXILIAR,
  UserType.FINANCEIRO,
  UserType.PD,
  UserType.COMUN,
  UserType.DIRETOR,
  UserType.ESTRATEGICO,
];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('repasse')
export class RepasseController {
  constructor(private readonly service: RepasseService) {}

  @Get('disponiveis/count')
  @Roles(...TODOS_TIPOS)
  countDisponiveis(@Request() req: any) {
    return this.service
      .countAbertosParaMimCached(req.user, req.user.tipoEscala)
      .then((count) => ({ count }));
  }

  @Post()
  @Roles(...TODOS_TIPOS)
  create(@Body() dto: CreateRepasseDto, @Request() req: any) {
    return this.service.create(dto, req.user);
  }

  @Patch(':id/aceitar')
  @Roles(...TODOS_TIPOS)
  aceitar(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.aceitar(id, req.user);
  }

  @Patch(':id/cancelar')
  @Roles(...TODOS_TIPOS)
  cancelar(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.cancelar(id, req.user);
  }

  @Get()
  @Roles(...TODOS_TIPOS)
  findAll() {
    return this.service.findAll();
  }

  @Get('disponiveis')
  @Roles(...TODOS_TIPOS)
  findDisponiveis(@Request() req: any) {
    return this.service.findAbertosParaMim(req.user, req.user.tipoEscala);
  }

  @Get('meus')
  @Roles(...TODOS_TIPOS)
  findMeus(@Request() req: any) {
    return this.service.findMeusRepasses(req.user);
  }

  @Get('buscar-usuario')
  @Roles(...TODOS_TIPOS)
  buscarUsuario(@Query('q') q: string, @Request() req: any) {
    return this.service.buscarUsuariosParaRepasse(
      q ?? '',
      req.user,
      req.user.tipoEscala, // ✅ NOVO
    );
  }

  @Get(':id')
  @Roles(...TODOS_TIPOS)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }
}
