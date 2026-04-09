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
import { OmeService } from './ome.service';
import { CreateOmeDto } from './dtos/create-ome.dto';
import { ReturnOmeDto } from './dtos/return-ome.dto';
import { Roles } from 'src/decorators/roles.decorator';
import { UserType } from 'src/user/enum/user-type.enum';
import { RolesGuard } from 'src/guards/roles.guard';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

@Controller('ome')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OmeController {
  constructor(private readonly omeService: OmeService) {}

  @Post()
  @Roles(UserType.MASTER)
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
  @Roles(UserType.MASTER)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateOmeDto>,
  ): Promise<ReturnOmeDto> {
    return this.omeService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserType.MASTER)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.omeService.remove(id);
  }
}
