// src/distribuicao/dtos/create-distribuicao.dto.ts
import { IsInt, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateDistribuicaoDto {
  @IsInt()
  teto_id: number;

  @IsInt()
  diretoria_id: number;

  @IsString()
  @IsNotEmpty()
  nome_dist: string;

  @IsInt()
  qtd_dist_of: number;

  @IsInt()
  qtd_dist_prc: number;
}
