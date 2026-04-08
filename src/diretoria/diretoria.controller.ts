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
  Query,
} from '@nestjs/common';
import { DiretoriaService } from './diretoria.service';
import { CreateDiretoriaDto } from './dtos/create-diretoria.dto';
import { ReturnDiretoriaDto } from './dtos/return-diretoria.dto';

@Controller('diretoria')
export class DiretoriaController {
  constructor(private readonly diretoriaService: DiretoriaService) {}

  @Post()
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
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDiretoriaDto: Partial<CreateDiretoriaDto>,
  ): Promise<ReturnDiretoriaDto> {
    return this.diretoriaService.update(id, createDiretoriaDto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.diretoriaService.remove(id);
  }
}
