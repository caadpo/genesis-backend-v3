import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { StatusViatura } from '../entities/viatura.entity';

export class CreateViaturaDto {
  @IsString()
  @IsNotEmpty()
  patrimonio!: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  kmAtual?: number;

  @IsEnum(StatusViatura)
  @IsOptional()
  statusVtr?: StatusViatura;

  @IsString()
  @IsOptional()
  anotacao?: string;
}
