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
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { UserType } from 'src/user/enum/user-type.enum';
import { CreateAvisoDto } from './dtos/create-aviso.dto';
import { UpdateAvisoDto } from './dtos/update-aviso.dto';
import { ReturnAvisoDto } from './dtos/return-aviso.dto';
import { AvisosService } from './aviso.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('avisos')
export class AvisosController {
  constructor(private readonly avisosService: AvisosService) {}

  // Qualquer usuário autenticado pode ver os avisos
  @Get()
  findAll(@Query('limit') limit?: string): Promise<ReturnAvisoDto[]> {
    return this.avisosService.findAll(limit ? Number(limit) : undefined);
  }

  @Get('total')
  async total(): Promise<{ total: number }> {
    return { total: await this.avisosService.count() };
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<ReturnAvisoDto> {
    return this.avisosService.findOne(id);
  }

  // ─── Somente MASTER ───────────────────────────────────────────────
  @Post()
  @Roles(UserType.MASTER)
  create(@Body() dto: CreateAvisoDto): Promise<ReturnAvisoDto> {
    return this.avisosService.create(dto);
  }

  @Patch(':id')
  @Roles(UserType.MASTER)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAvisoDto,
  ): Promise<ReturnAvisoDto> {
    return this.avisosService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserType.MASTER)
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.avisosService.remove(id);
  }
}
