// src/distribuicao/dtos/create-distribuicao.dto.ts
import { IsInt, IsNumber } from 'class-validator';

export class CreateDistribuicaoDto {
  @IsInt()
  teto_id: number;

  @IsInt()
  diretoria_id: number;

  @IsInt()
  qtd_oficiais: number;

  @IsInt()
  qtd_pracas: number;

  @IsNumber()
  valor_total: number;
}
