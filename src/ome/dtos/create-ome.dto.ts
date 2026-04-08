import { IsString, IsNumber } from 'class-validator';

export class CreateOmeDto {
  @IsString()
  nomeOme: string;

  @IsNumber()
  diretoriaId: number;
}
