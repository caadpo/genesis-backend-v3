// create-teto.dto.ts
import {
  IsEnum,
  IsString,
  IsNumber,
  IsDate,
  IsOptional,
} from 'class-validator';
import { Sistema, TipoPeriodo } from '../entities/teto.entity';

export class CreateTetoDto {
  @IsEnum(Sistema)
  sistema: Sistema;

  @IsString()
  nome_verba: string;

  @IsString()
  cod_verba: string;

  @IsNumber()
  valor_total: number;

  @IsNumber()
  ttctof: number;

  @IsNumber()
  ttctprc: number;

  @IsDate()
  data_inicio: Date;

  @IsOptional()
  @IsDate()
  data_fim?: Date;

  @IsEnum(TipoPeriodo)
  tipo_periodo: TipoPeriodo;
}
