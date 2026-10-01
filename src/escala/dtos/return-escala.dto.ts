import { EscalaEntity } from '../entities/escala.entity';

export class ReturnViaturaResumoDto {
  id: number;
  patrimonio: string;
  statusVtr: string;

  constructor(v: { id: number; patrimonio: string; statusVtr: string }) {
    this.id = v.id;
    this.patrimonio = v.patrimonio;
    this.statusVtr = v.statusVtr;
  }
}

/** Nomes já resolvidos ("PG MAT NOME_GUERRA") vindos de EscalaService.resolverNomes */
export interface NomesEscalaResolvidos {
  confirmador?: string | null;
  saidaPor?: string | null;
  verificador1?: string | null;
  verificador2?: string | null;
}

export class ReturnEscalaDto {
  id: number;
  sistema: string;
  pg_escala: string;
  mat_escala: string;
  ng_escala: string;
  tipo_escala: string;
  cpf_escala: string;
  nomecompleto_escala: string;
  nomeome_escala: string;
  nunfunc_escala: string;
  nunvinc_escala: string;
  dataInicio: string;
  horaInicio: string;
  horaFim: string;
  cota_escala: number;
  localApresentacao: string;
  funcao: string;
  situacao: string;
  anotacoes?: string;
  isRepasse: boolean;
  repasseOrigemId?: number | null;

  createdAt: Date;
  updatedAt: Date;
  usuarioId?: number;
  operacaoId?: number;
  viaturaId?: number | null;
  viatura?: ReturnViaturaResumoDto | null;
  nomeOperacao?: string;
  cod_op?: string;
  nomeEvento?: string;
  nomeOme?: string;
  status_teto?: string;

  conta?: {
    banco: string;
    agencia: string;
    conta: string;
  } | null;
  phone?: string | null;

  // ── Presença ──
  presencaConfirmada: boolean;
  presencaConfirmadaEm: Date | null;
  presencaLatitude: number | null;
  presencaLongitude: number | null;
  presencaConfirmadaPorId: number | null;
  presencaConfirmadaPorNome: string | null;

  // ── Saída ──
  saidaConfirmada: boolean;
  saidaConfirmadaEm: Date | null;
  saidaConfirmadaPorId: number | null;
  saidaConfirmadaPorNome: string | null;
  /** true quando o sistema fechou a saída (cron), e não o próprio usuário */
  saidaAutomatica: boolean;

  // ── 1ª verificação ──
  primeiraVerificacao: boolean;
  idVerificador1: number | null;
  verificador1Nome: string | null;
  dataHoraVerificador1: Date | null;
  obsVerificador1: string | null;

  // ── 2ª verificação ──
  segundaVerificacao: boolean;
  idVerificador2: number | null;
  verificador2Nome: string | null;
  dataHoraVerificador2: Date | null;
  obsVerificador2: string | null;

  comentario_pagamento?: string | null;

  constructor(e: EscalaEntity, nomes: NomesEscalaResolvidos = {}) {
    this.id = e.id;
    this.sistema = e.sistema;
    this.pg_escala = e.pg_escala;
    this.mat_escala = e.mat_escala;
    this.ng_escala = e.ng_escala;
    this.tipo_escala = e.tipo_escala;
    this.cpf_escala = e.cpf_escala;
    this.nomecompleto_escala = e.nomecompleto_escala;
    this.nomeome_escala = e.nomeome_escala;
    this.nunfunc_escala = e.nunfunc_escala;
    this.nunvinc_escala = e.nunvinc_escala;
    this.dataInicio = e.dataInicio;
    this.horaInicio = e.horaInicio;
    this.horaFim = e.horaFim;
    this.cota_escala = e.cota_escala;
    this.localApresentacao = e.localApresentacao;
    this.funcao = e.funcao;
    this.situacao = e.situacao;
    this.anotacoes = e.anotacoes;
    this.isRepasse = e.isRepasse;
    this.repasseOrigemId = e.repasseOrigemId ?? null;
    this.createdAt = e.createdAt;
    this.updatedAt = e.updatedAt;
    this.usuarioId = e.usuario?.id;
    this.operacaoId = e.operacao?.id;
    this.viaturaId = e.viaturaId ?? null;
    this.nomeOperacao = e.operacao?.nome_operacao;
    this.cod_op = e.operacao?.cod_op;
    this.nomeEvento = e.operacao?.evento?.nome_evento;
    this.nomeOme = e.operacao?.evento?.ome?.nomeOme;
    this.viatura = e.viatura ? new ReturnViaturaResumoDto(e.viatura) : null;
    this.status_teto =
      e.operacao?.evento?.distribuicao?.teto?.status ?? undefined;

    this.conta = e.conta
      ? {
          banco: e.conta.banco,
          agencia: e.conta.agencia,
          conta: e.conta.conta,
        }
      : null;
    this.phone = e.usuario?.phone ?? null;

    // Presença
    this.presencaConfirmada = e.presencaConfirmada ?? false;
    this.presencaConfirmadaEm = e.presencaConfirmadaEm ?? null;
    this.presencaLatitude = e.presencaLatitude ?? null;
    this.presencaLongitude = e.presencaLongitude ?? null;
    this.presencaConfirmadaPorId = e.presencaConfirmadaPorId ?? null;
    this.presencaConfirmadaPorId = e.presencaConfirmadaPorId ?? null;
    this.presencaConfirmadaPorNome = nomes.confirmador ?? null;

    // Saída
    this.saidaConfirmada = e.saidaConfirmada ?? false;
    this.saidaConfirmadaEm = e.saidaConfirmadaEm ?? null;
    this.saidaConfirmadaPorId = e.saidaConfirmadaPorId ?? null;
    this.saidaConfirmadaPorNome = nomes.saidaPor ?? null;
    this.saidaAutomatica =
      (e.saidaConfirmada ?? false) && e.saidaConfirmadaPorId == null;

    // 1ª verificação
    this.primeiraVerificacao = e.primeiraVerificacao ?? false;
    this.idVerificador1 = e.idVerificador1 ?? null;
    this.verificador1Nome = nomes.verificador1 ?? null;
    this.dataHoraVerificador1 = e.dataHoraVerificador1 ?? null;
    this.obsVerificador1 = e.obsVerificador1 ?? null;

    // 2ª verificação
    this.segundaVerificacao = e.segundaVerificacao ?? false;
    this.idVerificador2 = e.idVerificador2 ?? null;
    this.verificador2Nome = nomes.verificador2 ?? null;
    this.dataHoraVerificador2 = e.dataHoraVerificador2 ?? null;
    this.obsVerificador2 = e.obsVerificador2 ?? null;

    this.comentario_pagamento = null;
  }
}
