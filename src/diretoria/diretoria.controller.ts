// ome.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { DiretoriaService } from './diretoria.service';
import { CreateDiretoriaDto } from './dtos/create-diretoria.dto';
import { ReturnDiretoriaDto } from './dtos/return-diretoria.dto';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { UserType } from 'src/user/enum/user-type.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('diretoria')
export class DiretoriaController {
  constructor(private readonly diretoriaService: DiretoriaService) {}

  @Post()
  @Roles(UserType.MASTER)
  async create(
    @Body() createDiretoriaDto: CreateDiretoriaDto,
  ): Promise<ReturnDiretoriaDto> {
    return this.diretoriaService.create(createDiretoriaDto);
  }

  @Get()
  async findAll(): Promise<ReturnDiretoriaDto[]> {
    return this.diretoriaService.findAll();
  }

  @Put(':id')
  @Roles(UserType.MASTER)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDiretoriaDto: Partial<CreateDiretoriaDto>,
  ): Promise<ReturnDiretoriaDto> {
    return this.diretoriaService.update(id, createDiretoriaDto);
  }

  @Delete(':id')
  @Roles(UserType.MASTER)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.diretoriaService.remove(id);
  }
}
