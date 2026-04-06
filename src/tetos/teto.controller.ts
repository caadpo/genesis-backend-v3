import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { TetoService } from './teto.service';
import { Teto } from './entities/teto.entity';

@Controller('tetos')
export class TetosController {
  constructor(private readonly tetoService: TetoService) {}

  @Post()
  create(@Body() teto: Partial<Teto>): Promise<Teto> {
    return this.tetoService.create(teto);
  }

  @Get()
  findAll(): Promise<Teto[]> {
    return this.tetoService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Teto> {
    return this.tetoService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dados: Partial<Teto>,
  ): Promise<Teto> {
    return this.tetoService.update(id, dados);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.tetoService.remove(id);
  }
}
