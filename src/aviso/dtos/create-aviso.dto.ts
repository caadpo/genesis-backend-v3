import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateAvisoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nome!: string;

  @IsOptional()
  @IsString()
  descricao?: string | null;

  @IsOptional()
  @IsString()
  imagemUrl?: string | null;

  @IsDateString()
  dataHora!: string;
}
