export class UsuarioResumoEscalaDto {
  usuarioId!: number;
  mat!: string;
  pg!: string;
  nomeGuerra!: string;
  nomeCompleto!: string;
  nomeOme!: string;
  phone!: string;
  cpf!: string;
  tipo!: string;
  nunfunc!: string;
  nunvinc!: string;
  banco!: string;
  agencia!: string;
  conta!: string;
  totalCotas!: number;
}

export class ReturnEventoComEscalasDto {
  id!: number;
  nome_evento!: string;
  ne!: string;
  qtd_of_evento!: number;
  qtd_prc_evento!: number;
  status_evento!: string;

  // ─── Criação ──────────────────────────────────────────────────────────────
  criado_em?: Date;
  criado_por?: string;

  // ─── Homologação ──────────────────────────────────────────────────────────
  homologado_em?: Date | null;
  homologado_por?: string;

  // ─── Previsão de Desembolso ───────────────────────────────────────────────
  pd_concluida_em?: Date;
  pd_concluida_por?: string;

  // ─── Pagamento ────────────────────────────────────────────────────────────
  pago_em?: Date;
  pago_por?: string;

  created_at!: Date;
  updated_at!: Date;

  ome!: { id: number; nomeOme: string };
  teto!: { id: number; nome_verba: string; sistema: string };

  totalCotasOficiais!: number;
  totalCotasPracas!: number;
  usuarios!: UsuarioResumoEscalaDto[];
}
