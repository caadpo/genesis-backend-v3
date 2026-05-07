import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import { Sistema } from 'src/tetos/entities/teto.entity';

export class CreateEscalaDto {
  @IsEnum(Sistema)
  sistema!: Sistema;

  @IsInt()
  operacaoId!: number;

  @IsInt()
  usuarioId!: number;

  @IsDateString()
  dataInicio!: string;

  @IsString()
  horaInicio!: string;

  @IsString()
  horaFim!: string;

  @IsOptional()
  @IsString()
  localApresentacao?: string;

  @IsString()
  funcao!: string;

  @IsOptional()
  @IsString()
  situacao?: string;

  @IsOptional()
  @IsString()
  anotacoes?: string;
}
