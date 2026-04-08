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
} from '@nestjs/common';
import { OmeService } from './ome.service';
import { CreateOmeDto } from './dtos/create-ome.dto';
import { ReturnOmeDto } from './dtos/return-ome.dto';

@Controller('ome')
export class OmeController {
  constructor(private readonly omeService: OmeService) {}

  @Post()
  async create(@Body() dto: CreateOmeDto): Promise<ReturnOmeDto> {
    return this.omeService.create(dto);
  }

  @Get()
  async findAll(): Promise<ReturnOmeDto[]> {
    return this.omeService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<ReturnOmeDto> {
    return this.omeService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateOmeDto>,
  ): Promise<ReturnOmeDto> {
    return this.omeService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.omeService.remove(id);
  }
}
