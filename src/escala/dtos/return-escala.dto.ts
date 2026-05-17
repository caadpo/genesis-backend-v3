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
  mat: string;
  pg_escala: string;
  tipo_escala: string;
  nome_escala: string;
  nomeome_escala: string;
  phone_escala: string;
  cpf_escala: string;
  banco_escala: string;
  agencia_escala: string;
  conta_escala: string;
  dataInicio: string;
  horaInicio: string;
  horaFim: string;
  cota_escala: number;
  localApresentacao: string;
  funcao: string;
  situacao: string;
  anotacoes?: string;
  createdAt: Date;
  updatedAt: Date;
  usuarioId?: number;
  operacaoId?: number;
  viaturaId?: number | null;
  viatura?: ReturnViaturaResumoDto | null;
  nomeOperacao?: string;
  nomeEvento?: string;
  nomeOme?: string;

  constructor(e: EscalaEntity) {
    this.id = e.id;
    this.sistema = e.sistema;
    this.mat = e.mat;
    this.pg_escala = e.pg_escala;
    this.tipo_escala = e.tipo_escala;
    this.nome_escala = e.nome_escala;
    this.nomeome_escala = e.nomeome_escala;
    this.phone_escala = e.phone_escala;
    this.cpf_escala = e.cpf_escala;
    this.banco_escala = e.banco_escala;
    this.agencia_escala = e.agencia_escala;
    this.conta_escala = e.conta_escala;
    this.dataInicio = e.dataInicio;
    this.horaInicio = e.horaInicio;
    this.horaFim = e.horaFim;
    this.cota_escala = e.cota_escala;
    this.localApresentacao = e.localApresentacao;
    this.funcao = e.funcao;
    this.situacao = e.situacao;
    this.anotacoes = e.anotacoes;
    this.createdAt = e.createdAt;
    this.updatedAt = e.updatedAt;
    this.usuarioId = e.usuario?.id;
    this.operacaoId = e.operacao?.id;
    this.viaturaId = e.viaturaId ?? null;
    this.nomeOperacao = e.operacao?.nome_operacao;
    this.nomeEvento = e.operacao?.evento?.nome_evento;
    this.nomeOme = e.operacao?.evento?.ome?.nomeOme;
    // ✅ popula só se a relation vier carregada
    this.viatura = e.viatura ? new ReturnViaturaResumoDto(e.viatura) : null;
  }
}
