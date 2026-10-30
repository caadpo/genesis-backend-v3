import { EscalaEntity } from '../entities/escala.entity';
import { NomesEscalaResolvidos } from './return-escala.dto';

/**
 * DTO da lista "Minhas Escalas". Só traz o que a tela de calendário e o
 * modal de detalhes realmente usam. Sem CPF, conta bancária, telefone etc.
 */
export class ReturnMinhaEscalaDto {
  id: number;
  sistema: string;
  tipo_escala: string;
  dataInicio: string;
  horaInicio: string;
  horaFim: string;
  cota_escala: number;
  localApresentacao: string;
  funcao: string;
  situacao: string;
  anotacoes?: string;

  operacaoId?: number;
  nomeOperacao?: string;
  cod_op?: string;
  nomeEvento?: string;
  nomeOme?: string;

  // financeiro
  valorIndividual: number;
  pagamento: string;
  comentario_pagamento: string | null;

  // presença
  presencaConfirmada: boolean;
  presencaConfirmadaEm: Date | null;
  presencaLatitude: number | null;
  presencaLongitude: number | null;

  // saída
  saidaConfirmada: boolean;
  saidaConfirmadaEm: Date | null;
  saidaAutomatica: boolean;

  // verificações
  primeiraVerificacao: boolean;
  verificador1Nome: string | null;
  dataHoraVerificador1: Date | null;
  obsVerificador1: string | null;

  segundaVerificacao: boolean;
  verificador2Nome: string | null;
  dataHoraVerificador2: Date | null;
  obsVerificador2: string | null;

  constructor(
    e: EscalaEntity,
    nomes: NomesEscalaResolvidos,
    extras: {
      valorIndividual: number;
      pagamento: string;
      comentario_pagamento: string | null;
    },
  ) {
    this.id = e.id;
    this.sistema = e.sistema;
    this.tipo_escala = e.tipo_escala;
    this.dataInicio = e.dataInicio;
    this.horaInicio = e.horaInicio;
    this.horaFim = e.horaFim;
    this.cota_escala = e.cota_escala;
    this.localApresentacao = e.localApresentacao;
    this.funcao = e.funcao;
    this.situacao = e.situacao;
    this.anotacoes = e.anotacoes ?? undefined;

    this.operacaoId = e.operacao?.id;
    this.nomeOperacao = e.operacao?.nome_operacao;
    this.cod_op = e.operacao?.cod_op;
    this.nomeEvento = e.operacao?.evento?.nome_evento;
    this.nomeOme = e.operacao?.evento?.ome?.nomeOme;

    this.valorIndividual = extras.valorIndividual;
    this.pagamento = extras.pagamento;
    this.comentario_pagamento = extras.comentario_pagamento;

    this.presencaConfirmada = e.presencaConfirmada ?? false;
    this.presencaConfirmadaEm = e.presencaConfirmadaEm ?? null;
    this.presencaLatitude = e.presencaLatitude ?? null;
    this.presencaLongitude = e.presencaLongitude ?? null;

    this.saidaConfirmada = e.saidaConfirmada ?? false;
    this.saidaConfirmadaEm = e.saidaConfirmadaEm ?? null;
    this.saidaAutomatica =
      (e.saidaConfirmada ?? false) && e.saidaConfirmadaPorId == null;

    this.primeiraVerificacao = e.primeiraVerificacao ?? false;
    this.verificador1Nome = nomes.verificador1 ?? null;
    this.dataHoraVerificador1 = e.dataHoraVerificador1 ?? null;
    this.obsVerificador1 = e.obsVerificador1 ?? null;

    this.segundaVerificacao = e.segundaVerificacao ?? false;
    this.verificador2Nome = nomes.verificador2 ?? null;
    this.dataHoraVerificador2 = e.dataHoraVerificador2 ?? null;
    this.obsVerificador2 = e.obsVerificador2 ?? null;
  }
}
