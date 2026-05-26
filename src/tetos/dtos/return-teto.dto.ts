import { Sistema, TipoPeriodo } from '../entities/teto.entity';
import { StatusTeto } from '../enum/teto-type.enum';

export class ReturnTetoDto {
  id!: number;
  imagemUrl!: string;
  sistema!: Sistema;
  nome_verba!: string;
  cod_verba!: string;
  valor_total!: number;
  ttctof!: number;
  ttctprc!: number;
  data_inicio!: string;
  data_fim?: string;
  tipo_periodo!: TipoPeriodo;
  status!: StatusTeto;
  qtd_dist_of!: number;
  qtd_dist_prc!: number;
  saldo_of!: number;
  saldo_prc!: number;
  totalCotasOficiais!: number;
  totalCotasPracas!: number;
  created_at!: Date;
  updated_at!: Date;
}
