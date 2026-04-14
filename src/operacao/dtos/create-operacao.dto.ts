import { IsInt, IsString } from 'class-validator';

export class CreateOperacaoDto {
  @IsInt()
  evento_id: number;

  @IsInt()
  ome_id: number;

  @IsString()
  nome_operacao: string;

  @IsString()
  cod_verba: string;

  @IsString()
  cod_op: string;

  @IsInt()
  qtd_oficiais_oper: number;

  @IsInt()
  qtd_pracas_oper: number;

  @IsInt()
  user_id: number;
}
