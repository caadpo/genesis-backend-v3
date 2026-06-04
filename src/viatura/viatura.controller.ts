import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ViaturaService } from './viatura.service';
import { CreateViaturaDto } from './dtos/create-viatura.dto';
import { UpdateViaturaDto } from './dtos/update-viatura.dto';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { UserType } from 'src/user/enum/user-type.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('viatura')
export class ViaturaController {
  constructor(private readonly service: ViaturaService) {}

  @Post()
  @Roles(UserType.MASTER, UserType.TECNICO, UserType.AUXILIAR)
  create(@Body() dto: CreateViaturaDto, @Request() req: any) {
    return this.service.create(dto, req.user);
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
  findAll(@Request() req: any, @Query('operacaoId') operacaoId?: string) {
    if (operacaoId) {
      return this.service.findByOperacao(Number(operacaoId));
    }
    return this.service.findByOme(req.user);
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
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles(UserType.MASTER, UserType.TECNICO, UserType.AUXILIAR)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateViaturaDto,
    @Request() req: any,
  ) {
    return this.service.update(id, dto, req.user);
  }

  @Delete(':id')
  @Roles(UserType.MASTER, UserType.TECNICO, UserType.AUXILIAR)
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.remove(id, req.user);
  }
}
