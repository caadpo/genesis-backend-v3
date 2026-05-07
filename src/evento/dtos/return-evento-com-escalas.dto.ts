export class UsuarioResumoEscalaDto {
  usuarioId!: number;
  mat!: number;
  pg!: string;
  nomeGuerra!: string;
  nomeOme!: string;
  phone!: string;
  cpf!: string;
  nunfunc!: string;
  nunvinc!: string;
  banco!: string;
  agencia!: string;
  conta!: string;
  totalCotas!: number;
}

export class ReturnEventoComEscalasDto {
  // ─── Dados do Evento ──────────────────────────────────────────────────────────
  id!: number;
  nome_evento!: string;
  qtd_of_evento!: number;
  qtd_prc_evento!: number;
  status_evento!: string;
  homologado_em?: Date;
  pd_concluida_em?: Date;
  pago_em?: Date;
  created_at!: Date;
  updated_at!: Date;
  ome!: { id: number; nomeOme: string };

  // ─── Totalizadores ──────────────────────────────────────────────────────────
  totalCotasOficiais!: number;
  totalCotasPracas!: number;

  // ─── Usuários com soma de cotas ─────────────────────────────────────────────
  usuarios!: UsuarioResumoEscalaDto[];
}
