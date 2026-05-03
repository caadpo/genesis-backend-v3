import { IsInt, IsNumber, IsString } from 'class-validator';

export class CreateEventoDto {
  @IsInt()
  distribuicao_id!: number;

  @IsInt()
  ome_id!: number;

  @IsString()
  nome_evento!: string;

  @IsInt()
  qtd_of_evento!: number;

  @IsInt()
  qtd_prc_evento!: number;
}
