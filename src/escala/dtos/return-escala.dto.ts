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

  // Novos campos relacionados
  conta?: {
    banco: string;
    agencia: string;
    conta: string;
  } | null;
  phone?: string | null;

  presencaConfirmada!: boolean;
  presencaObservacao?: string | null;
  presencaConfirmadaEm?: Date | null;
  presencaConfirmadaPorNome?: string | null;
  comentario_pagamento?: string | null;
  observacaoEscritaPorNome!: string | null;
  observacaoEscritaEm!: Date | null;

  constructor(
    e: EscalaEntity,
    nomeConfirmador?: string | null,
    nomeObsAutor?: string | null,
  ) {
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

    this.presencaConfirmada = e.presencaConfirmada ?? false;
    this.presencaObservacao = e.presencaObservacao ?? null;
    this.presencaConfirmadaEm = e.presencaConfirmadaEm ?? null;
    this.presencaConfirmadaPorNome = nomeConfirmador ?? null;
    this.comentario_pagamento = null;
    this.observacaoEscritaPorNome = nomeObsAutor ?? null;
    this.observacaoEscritaEm = e.observacaoEscritaEm ?? null;
  }
}
