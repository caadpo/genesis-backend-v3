export class ReturnOperacaoComTotalCotasDto {
  id: number;
  evento: {
    id: number;
    nome_evento: string;
    qtd_of_evento: number;
    qtd_prc_evento: number;
    status_evento: string;
    homologado_em: Date | null;
    pd_concluida_em: Date | null;
    pago_em: Date | null;
    created_at: Date;
    updated_at: Date;
  };
  ome: {
    id: number;
    nomeOme: string;
    diretoriaId: number;
    createdAt: Date;
    updatedAt: Date;
  };
  nome_operacao: string;
  qtd_oficiais_oper: number;
  qtd_pracas_oper: number;
  cod_op: string;
  created_at: Date;
  updated_at: Date;

  // Novos campos para totalCotas
  totalCotasOficiais?: number;
  totalCotasPracas?: number;
  cotasPorTipo?: Array<{
    tipo_escala: string;
    totalCotas: number;
  }>;

  constructor(
    operacao: any,
    cotasPorTipo?: Array<{ tipo_escala: string; totalCotas: number }>,
  ) {
    this.id = operacao.id;
    this.evento = operacao.evento;
    this.ome = operacao.ome;
    this.nome_operacao = operacao.nome_operacao;
    this.qtd_oficiais_oper = operacao.qtd_oficiais_oper;
    this.qtd_pracas_oper = operacao.qtd_pracas_oper;
    this.cod_op = operacao.cod_op;
    this.created_at = operacao.created_at;
    this.updated_at = operacao.updated_at;

    this.cotasPorTipo = cotasPorTipo || [];
    this.totalCotasOficiais =
      cotasPorTipo?.find((c) => c.tipo_escala === 'O')?.totalCotas ?? 0;
    this.totalCotasPracas =
      cotasPorTipo?.find((c) => c.tipo_escala === 'P')?.totalCotas ?? 0;
  }
}
