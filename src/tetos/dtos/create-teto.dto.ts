import {
  IsEnum,
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { Sistema, TipoPeriodo } from '../entities/teto.entity';
import { StatusTeto } from '../enum/teto-type.enum';

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

  @IsDateString()
  data_inicio: string;

  @IsOptional()
  @IsDateString()
  data_fim?: string;

  @IsEnum(TipoPeriodo)
  tipo_periodo: TipoPeriodo;

  @IsOptional()
  @IsEnum(StatusTeto)
  status?: StatusTeto;
}
