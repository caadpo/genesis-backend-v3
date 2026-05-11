import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PagamentoEntity } from './entities/pagamento.entity';
import { ReturnPagamentoDto } from './dtos/return-pagamento.dto';
import { EscalaEntity } from 'src/escala/entities/escala.entity';
import { Evento } from 'src/evento/entities/evento.entity';
import { UserEntity } from 'src/user/entities/user.entity';

// ─── Valor por cota por tipo ──────────────────────────────────────────────────
const VALOR_COTA: Record<string, number> = {
  O: 300,
  P: 200,
};

@Injectable()
export class PagamentoService {
  constructor(
    @InjectRepository(PagamentoEntity)
    private readonly repo: Repository<PagamentoEntity>,

    @InjectRepository(EscalaEntity)
    private readonly escalaRepo: Repository<EscalaEntity>,

    @InjectRepository(Evento)
    private readonly eventoRepo: Repository<Evento>,
  ) {}

  // ─── Gerar pagamentos a partir do resumo do evento ───────────────────────────
  async gerarPagamentos(eventoId: number): Promise<ReturnPagamentoDto[]> {
    const evento = await this.eventoRepo.findOne({
      where: { id: eventoId },
      relations: ['distribuicao', 'distribuicao.teto'],
    });
    if (!evento) throw new NotFoundException('Evento não encontrado');

    // ✅ Mesma query do resumo — agrupa cotas por usuário
    const rows = await this.escalaRepo
      .createQueryBuilder('e')
      .select('e.usuario_id', 'usuarioId')
      .addSelect('e.mat', 'mat')
      .addSelect('e.pg_escala', 'pg')
      .addSelect('e.nome_escala', 'nome')
      .addSelect('e.nomeome_escala', 'nomeOme')
      .addSelect('e.cpf_escala', 'cpf')
      .addSelect('e.tipo_escala', 'tipo')
      .addSelect('e.banco_escala', 'banco')
      .addSelect('e.agencia_escala', 'agencia')
      .addSelect('e.conta_escala', 'conta')
      .addSelect('COALESCE(SUM(e.cota_escala), 0)', 'totalCotas')
      .innerJoin('e.operacao', 'op')
      .innerJoin('op.evento', 'ev')
      .where('ev.id = :eventoId', { eventoId })
      .groupBy('e.usuario_id')
      .addGroupBy('e.mat')
      .addGroupBy('e.pg_escala')
      .addGroupBy('e.nome_escala')
      .addGroupBy('e.nomeome_escala')
      .addGroupBy('e.cpf_escala')
      .addGroupBy('e.tipo_escala')
      .addGroupBy('e.banco_escala')
      .addGroupBy('e.agencia_escala')
      .addGroupBy('e.conta_escala')
      .getRawMany();

    if (!rows.length) {
      throw new BadRequestException(
        'Nenhuma escala encontrada para este evento',
      );
    }

    const teto = evento.distribuicao?.teto;
    const sistema = teto?.sistema ?? '';
    const nome_verba = teto?.nome_verba ?? '';

    // ✅ Cria ou atualiza os registros de pagamento
    const pagamentos: PagamentoEntity[] = [];

    for (const r of rows) {
      const valorCota = VALOR_COTA[r.tipo] ?? 0;
      const totalCotas = Number(r.totalCotas);

      // upsert por eventoId + usuarioId
      let pagamento = await this.repo.findOne({
        where: { eventoId, usuarioId: Number(r.usuarioId) },
      });

      if (!pagamento) {
        pagamento = this.repo.create({
          eventoId,
          usuarioId: Number(r.usuarioId),
          evento: { id: eventoId },
          usuario: { id: Number(r.usuarioId) } as UserEntity,
        });
      }

      // ✅ Snapshot e totais
      pagamento.mat = Number(r.mat);
      pagamento.pg_pagamento = r.pg;
      pagamento.nome_pagamento = r.nome;
      pagamento.nomeome_pagamento = r.nomeOme;
      pagamento.cpf_pagamento = r.cpf;
      pagamento.tipo_pagamento = r.tipo;
      pagamento.banco_pagamento = r.banco;
      pagamento.agencia_pagamento = r.agencia;
      pagamento.conta_pagamento = r.conta;
      pagamento.sistema = sistema;
      pagamento.nome_verba = nome_verba;
      pagamento.total_cotas = totalCotas;
      pagamento.valor_cota = valorCota;
      pagamento.valor_total = totalCotas * valorCota;

      pagamentos.push(pagamento);
    }

    const saved = await this.repo.save(pagamentos);
    return saved.map((p) => new ReturnPagamentoDto(p));
  }

  // ─── Listar pagamentos por evento ────────────────────────────────────────────
  async findByEvento(eventoId: number): Promise<ReturnPagamentoDto[]> {
    const pagamentos = await this.repo.find({
      where: { eventoId },
      order: { nomeome_pagamento: 'ASC', nome_pagamento: 'ASC' },
    });
    return pagamentos.map((p) => new ReturnPagamentoDto(p));
  }
}
