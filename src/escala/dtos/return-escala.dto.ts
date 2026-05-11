import { EscalaEntity } from '../entities/escala.entity';

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
  anotacoes: string;
  createdAt: Date;
  updatedAt: Date;

  // ✅ Mantém referência ao usuário e operação para navegação no frontend
  usuarioId: number;
  operacaoId: number;

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
  }
}
