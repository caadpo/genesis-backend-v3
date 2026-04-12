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
} from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { UserType } from 'src/user/enum/user-type.enum';
import { TetoService } from './teto.service';
import { Teto } from './entities/teto.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tetos')
export class TetosController {
  constructor(private readonly tetoService: TetoService) {}

  @Post()
  @Roles(UserType.MASTER, UserType.TECNICO)
  create(@Body() teto: Partial<Teto>): Promise<Teto> {
    return this.tetoService.create(teto);
  }

  @Get()
  @Roles(
    UserType.AUXILIAR,
    UserType.DIRETOR,
    UserType.ESTRATEGICO,
    UserType.FINANCEIRO,
    UserType.PD,
    UserType.TECNICO,
    UserType.MASTER,
  )
  findAll(
    @Query('sistema') sistema?: string,
    @Query('mes') mes?: string,
    @Query('ano') ano?: string,
  ): Promise<Teto[]> {
    return this.tetoService.findAll(sistema, mes, ano);
  }

  @Get(':id')
  @Roles(
    UserType.AUXILIAR,
    UserType.DIRETOR,
    UserType.ESTRATEGICO,
    UserType.FINANCEIRO,
    UserType.PD,
    UserType.TECNICO,
    UserType.MASTER,
  )
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Teto> {
    return this.tetoService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserType.MASTER, UserType.TECNICO)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dados: Partial<Teto>,
  ): Promise<Teto> {
    return this.tetoService.update(id, dados);
  }

  @Delete(':id')
  @Roles(UserType.MASTER, UserType.TECNICO)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.tetoService.remove(id);
  }
}
