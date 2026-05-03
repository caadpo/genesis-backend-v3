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
import { CreateTetoDto } from './dtos/create-teto.dto';
import { UpdateTetoDto } from './dtos/update-teto.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tetos')
export class TetosController {
  constructor(private readonly tetoService: TetoService) {}

  @Post()
  @Roles(UserType.MASTER, UserType.TECNICO)
  create(@Body() dto: CreateTetoDto): Promise<Teto> {
    return this.tetoService.create(dto);
  }

  // 🔵 PJES
  @Get('pjes')
  @Roles(
    UserType.AUXILIAR,
    UserType.DIRETOR,
    UserType.ESTRATEGICO,
    UserType.TECNICO,
    UserType.MASTER,
  )
  findPjes(
    @Query('mes') mes: number,
    @Query('ano') ano: number,
  ): Promise<Teto[]> {
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
  findDiarias(): Promise<Teto[]> {
    return this.tetoService.findDiariasAbertas();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Teto> {
    return this.tetoService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserType.MASTER, UserType.TECNICO)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTetoDto,
  ): Promise<Teto> {
    return this.tetoService.update(id, dto);
  }

  // 🔒 ENCERRAR FOLHA
  @Patch(':id/encerrar')
  @Roles(UserType.MASTER, UserType.TECNICO)
  encerrar(@Param('id', ParseIntPipe) id: number): Promise<Teto> {
    return this.tetoService.encerrar(id);
  }

  @Delete(':id')
  @Roles(UserType.MASTER, UserType.TECNICO)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.tetoService.remove(id);
  }
}
