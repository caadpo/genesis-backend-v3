import { Distribuicao } from '../entities/distribuicao.entity';

export class TotalCotasPorTipoDto {
  tipo_escala: string;
  totalCotas: number;
}

export class ReturnDistribuicaoComTotalCotasDto {
  id: number;
  teto: Distribuicao['teto'];
  diretoria: Distribuicao['diretoria'];
  nome_dist: string;
  qtd_dist_of: number;
  qtd_dist_prc: number;
  created_at: Date;
  updated_at: Date;
  totalCotasOficiais: number;
  totalCotasPracas: number;
  saldo_of: number;
  saldo_prc: number;
  cotasPorTipo: TotalCotasPorTipoDto[];

  constructor(
    distribuicao: Distribuicao,
    cotasPorTipo: TotalCotasPorTipoDto[],
    somaEventosOf: number,
    somaEventosPrc: number,
  ) {
    this.id = distribuicao.id;
    this.teto = distribuicao.teto;
    this.diretoria = distribuicao.diretoria;
    this.nome_dist = distribuicao.nome_dist;
    this.qtd_dist_of = distribuicao.qtd_dist_of;
    this.qtd_dist_prc = distribuicao.qtd_dist_prc;
    this.created_at = distribuicao.created_at;
    this.updated_at = distribuicao.updated_at;
    this.cotasPorTipo = cotasPorTipo;
    this.totalCotasOficiais =
      cotasPorTipo.find((c) => c.tipo_escala === 'O')?.totalCotas ?? 0;
    this.totalCotasPracas =
      cotasPorTipo.find((c) => c.tipo_escala === 'P')?.totalCotas ?? 0;
    this.saldo_of = distribuicao.qtd_dist_of - somaEventosOf;
    this.saldo_prc = distribuicao.qtd_dist_prc - somaEventosPrc;
  }
}
