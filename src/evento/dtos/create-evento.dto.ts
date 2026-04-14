import { IsInt, IsNumber, IsString } from 'class-validator';

export class CreateEventoDto {
  @IsInt()
  distribuicao_id: number;

  @IsInt()
  ome_id: number;

  @IsString()
  nome: string;

  @IsInt()
  qtd_oficiais: number;

  @IsInt()
  qtd_pracas: number;

  @IsNumber()
  valor_total: number;
}
