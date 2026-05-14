import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
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

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('repasse')
export class RepasseController {
  constructor(private readonly service: RepasseService) {}

  // ─── Criar repasse (ofertante anuncia que quer repassar) ─────────────────────
  @Post()
  @Roles(
    UserType.MASTER,
    UserType.TECNICO,
    UserType.AUXILIAR,
    UserType.FINANCEIRO,
    UserType.PD,
    UserType.COMUN,
    UserType.DIRETOR,
    UserType.ESTRATEGICO,
  )
  create(@Body() dto: CreateRepasseDto, @Request() req: any) {
    return this.service.create(dto, req.user);
  }

  // ─── Aceitar repasse (receptor pega o serviço) ────────────────────────────────
  @Patch(':id/aceitar')
  @Roles(
    UserType.MASTER,
    UserType.TECNICO,
    UserType.AUXILIAR,
    UserType.FINANCEIRO,
    UserType.PD,
    UserType.COMUN,
    UserType.DIRETOR,
    UserType.ESTRATEGICO,
  )
  aceitar(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.aceitar(id, req.user);
  }

  // ─── Cancelar repasse (ofertante desiste) ─────────────────────────────────────
  @Patch(':id/cancelar')
  @Roles(
    UserType.MASTER,
    UserType.TECNICO,
    UserType.AUXILIAR,
    UserType.FINANCEIRO,
    UserType.PD,
    UserType.COMUN,
    UserType.DIRETOR,
    UserType.ESTRATEGICO,
  )
  cancelar(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.cancelar(id, req.user);
  }

  // ─── Listar TODOS os repasses (administrativo) ────────────────────────────────
  @Get()
  @Roles(
    UserType.MASTER,
    UserType.TECNICO,
    UserType.AUXILIAR,
    UserType.FINANCEIRO,
    UserType.PD,
    UserType.COMUN,
    UserType.DIRETOR,
    UserType.ESTRATEGICO,
  )
  findAll() {
    return this.service.findAll();
  }

  // ─── Listar repasses disponíveis para o usuário logado ───────────────────────
  @Get('disponiveis')
  @Roles(
    UserType.MASTER,
    UserType.TECNICO,
    UserType.AUXILIAR,
    UserType.FINANCEIRO,
    UserType.PD,
    UserType.COMUN,
    UserType.DIRETOR,
    UserType.ESTRATEGICO,
  )
  findDisponiveis(@Request() req: any) {
    // ✅ passa undefined quando não existir — o service busca no banco
    return this.service.findAbertosParaMim(req.user, req.user.tipoEscala);
  }

  // ─── Meus repasses ofertados ──────────────────────────────────────────────────
  @Get('meus')
  @Roles(
    UserType.MASTER,
    UserType.TECNICO,
    UserType.AUXILIAR,
    UserType.FINANCEIRO,
    UserType.PD,
    UserType.COMUN,
    UserType.DIRETOR,
    UserType.ESTRATEGICO,
  )
  findMeus(@Request() req: any) {
    return this.service.findMeusRepasses(req.user);
  }

  // ─── Buscar repasse por id ────────────────────────────────────────────────────
  @Get(':id')
  @Roles(
    UserType.MASTER,
    UserType.TECNICO,
    UserType.AUXILIAR,
    UserType.FINANCEIRO,
    UserType.PD,
    UserType.COMUN,
    UserType.DIRETOR,
    UserType.ESTRATEGICO,
  )
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }
}
