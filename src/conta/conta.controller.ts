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
import { Roles } from 'src/decorators/roles.decorator';
import { UserType } from 'src/user/enum/user-type.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('conta')
export class ContaController {
  constructor(private readonly service: ContaService) {}

  /**
   * Qualquer usuário logado pode atualizar a própria conta bancária.
   * Ao atualizar, isEfisco é automaticamente marcado como false,
   * sinalizando que o FINANCEIRO precisa registrar no e-Fisco.
   */
  @Patch('me/propria')
  @Roles(
    UserType.COMUN,
    UserType.AUXILIAR,
    UserType.FINANCEIRO,
    UserType.MASTER,
    UserType.TECNICO,
    UserType.DIRETOR,
    UserType.ESTRATEGICO,
    UserType.PD,
    UserType.GESTOR_VERBA,
  )
  atualizarPropriaConta(@Body() dto: UpdateContaDto, @Req() req: any) {
    return this.service.atualizarPropriaConta(req.user.id, dto);
  }

  /**
   * FINANCEIRO (ou MASTER/TECNICO) lista todas as contas com isEfisco = false,
   * ou seja, que foram atualizadas pelo usuário mas ainda não confirmadas no e-Fisco.
   */
  @Get('pendentes-efisco')
  @Roles(UserType.FINANCEIRO, UserType.MASTER, UserType.TECNICO)
  listarPendentes(@Req() req: any) {
    return this.service.listarPendentesEfisco(req.user);
  }

  /**
   * FINANCEIRO confirma que atualizou a conta no sistema e-Fisco.
   * Isso marca isEfisco = true e remove da lista de pendentes.
   */
  @Patch(':id/efisco')
  @Roles(UserType.FINANCEIRO, UserType.MASTER, UserType.TECNICO)
  confirmarEfisco(@Param('id') id: number, @Req() req: any) {
    return this.service.confirmarEfisco(id, req.user);
  }

  @Post()
  criar(@Body() dto: CreateContaDto, @Req() req: any) {
    return this.service.criar(dto, req.user);
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
    return this.service.atualizar(id, dto, req.user);
  }

  @Delete(':id')
  remover(@Param('id') id: number) {
    return this.service.remover(id);
  }
}
