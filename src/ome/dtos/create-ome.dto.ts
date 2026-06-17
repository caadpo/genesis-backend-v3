import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateOmeDto {
  @IsString()
  nomeOme!: string;

  @IsOptional()
  @IsString()
  efisco?: string;

  @IsNumber()
  diretoriaId!: number;
}
