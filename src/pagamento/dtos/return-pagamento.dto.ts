import { PagamentoEntity } from '../entities/pagamento.entity';

export class ReturnPagamentoDto {
  id: number;
  eventoId: number;
  usuarioId: number;
  nome_pagamento: string;
  nomeome_pagamento: string;
  cpf_pagamento: string;
  tipo_pagamento: string;
  banco_pagamento: string;
  agencia_pagamento: string;
  conta_pagamento: string;
  sistema: string;
  nome_verba: string;
  total_cotas: number;
  valor_cota: number;
  valor_total: number;
  createdAt: Date;
  nome_evento!: string;
  nome_ome!: string;

  constructor(p: PagamentoEntity) {
    this.id = p.id;
    this.eventoId = p.eventoId;
    this.usuarioId = p.usuarioId;
    this.nome_pagamento = p.nome_pagamento;
    this.nomeome_pagamento = p.nomeome_pagamento;
    this.cpf_pagamento = p.cpf_pagamento;
    this.tipo_pagamento = p.tipo_pagamento;
    this.banco_pagamento = p.banco_pagamento;
    this.agencia_pagamento = p.agencia_pagamento;
    this.conta_pagamento = p.conta_pagamento;
    this.sistema = p.sistema;
    this.nome_verba = p.nome_verba;
    this.total_cotas = p.total_cotas;
    this.valor_cota = p.valor_cota;
    this.valor_total = p.valor_total;
    this.createdAt = p.createdAt;
    this.nome_evento = p.evento?.nome_evento ?? '';
    this.nome_ome = p.evento?.ome?.nomeOme ?? '';
  }
}
