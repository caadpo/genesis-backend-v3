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
import { Teto } from 'src/tetos/entities/teto.entity';
import { StatusTeto } from 'src/tetos/enum/teto-type.enum';

@Injectable()
export class PagamentoService {
  constructor(
    @InjectRepository(PagamentoEntity)
    private readonly repo: Repository<PagamentoEntity>,

    @InjectRepository(EscalaEntity)
    private readonly escalaRepo: Repository<EscalaEntity>,

    @InjectRepository(Evento)
    private readonly eventoRepo: Repository<Evento>,

    @InjectRepository(Teto)
    private readonly tetoRepo: Repository<Teto>,
  ) {}

  // ─── Gerar pagamentos a partir do resumo do evento ───────────────────────────
  async gerarPagamentos(eventoId: number): Promise<ReturnPagamentoDto[]> {
    const evento = await this.eventoRepo.findOne({
      where: { id: eventoId },
      relations: ['distribuicao', 'distribuicao.teto'],
    });
    if (!evento) throw new NotFoundException('Evento não encontrado');

    const rows = await this.escalaRepo
      .createQueryBuilder('e')
      .select('e.usuario_id', 'usuarioId')
      .addSelect('e.nomecompleto_escala', 'nomeCompleto')
      .addSelect('e.nomeome_escala', 'nomeOme')
      .addSelect('e.cpf_escala', 'cpf')
      .addSelect('e.tipo_escala', 'tipo')
      .addSelect('c.banco', 'banco')
      .addSelect('c.agencia', 'agencia')
      .addSelect('c.conta', 'conta')
      .addSelect('COALESCE(SUM(e.cota_escala), 0)', 'totalCotas')
      .innerJoin('e.operacao', 'op')
      .innerJoin('op.evento', 'ev')
      .leftJoin('e.usuario', 'u')
      .leftJoin('u.conta', 'c')
      .where('ev.id = :eventoId', { eventoId })
      .groupBy('e.usuario_id')
      .addGroupBy('e.nomecompleto_escala')
      .addGroupBy('e.nomeome_escala')
      .addGroupBy('e.cpf_escala')
      .addGroupBy('e.tipo_escala')
      .addGroupBy('c.banco')
      .addGroupBy('c.agencia')
      .addGroupBy('c.conta')
      .getRawMany();

    if (!rows.length) {
      throw new BadRequestException(
        'Nenhuma escala encontrada para este evento',
      );
    }

    const teto = evento.distribuicao?.teto;
    const sistema = teto?.sistema ?? '';
    const nome_verba = teto?.nome_verba ?? '';

    const pagamentos: PagamentoEntity[] = [];

    for (const r of rows) {
      let valorCota = 0;

      if (sistema === 'DIARIAS') {
        valorCota = 180;
      } else if (sistema === 'PJES') {
        valorCota = r.tipo === 'O' ? 300 : 200;
      }
      const totalCotas = Number(r.totalCotas);

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

      pagamento.nome_pagamento = r.nomeCompleto ?? '';
      pagamento.nomeome_pagamento = r.nomeOme ?? '';
      pagamento.cpf_pagamento = r.cpf ?? '';
      pagamento.tipo_pagamento = r.tipo ?? '';
      pagamento.banco_pagamento = r.banco ?? '';
      pagamento.agencia_pagamento = r.agencia ?? '';
      pagamento.conta_pagamento = r.conta ?? '';
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

  // ─── Eventos pagos unificados: DIARIAS (status_evento=PAGO) + PJES (teto.status=ENCERRADO) ──
  async findEventosPagos(limit?: number): Promise<any[]> {
    // ── 1. DIARIAS: via tabela pagamento (comportamento original) ─────────────
    const qbDiarias = this.repo
      .createQueryBuilder('p')
      .select('p.evento_id', 'eventoId')
      .addSelect('ev.nome_evento', 'nome_evento')
      .addSelect('ome.nomeOme', 'nome_ome')
      .addSelect('p.sistema', 'sistema')
      .addSelect('p.nome_verba', 'nome_verba')
      .addSelect('COUNT(DISTINCT p.usuario_id)', 'total_policiais')
      .addSelect('SUM(p.valor_total)', 'valor_total_evento')
      .addSelect('MIN(p.created_at)', 'createdAt')
      .innerJoin('evento', 'ev', 'ev.id = p.evento_id')
      .innerJoin('ome', 'ome', 'ome.id = ev.ome_id')
      .where("p.sistema = 'DIARIAS'")
      .groupBy('p.evento_id')
      .addGroupBy('ev.nome_evento')
      .addGroupBy('ome.nomeOme')
      .addGroupBy('p.sistema')
      .addGroupBy('p.nome_verba')
      .orderBy('MIN(p.created_at)', 'DESC');

    if (limit) qbDiarias.limit(limit);

    const rowsDiarias = await qbDiarias.getRawMany();

    // ── 2. PJES: via teto com status ENCERRADO ────────────────────────────────
    // Busca os tetos PJES encerrados e agrega dados de eventos/OMEs vinculados
    const rowsPjes = await this.tetoRepo
      .createQueryBuilder('t')
      .select('t.id', 'eventoId') // usa tetoId como identificador único
      .addSelect('t.nome_verba', 'nome_evento')
      .addSelect("'PJES - ' || t.nome_verba", 'nome_ome')
      .addSelect("'PJES'", 'sistema')
      .addSelect('t.nome_verba', 'nome_verba')
      .addSelect(
        // conta policiais distintos escalados em eventos desse teto
        (sub) =>
          sub
            .select('COUNT(DISTINCT e.usuario_id)')
            .from(EscalaEntity, 'e')
            .innerJoin('e.operacao', 'op')
            .innerJoin('op.evento', 'ev')
            .innerJoin('ev.distribuicao', 'd')
            .where('d.teto_id = t.id'),
        'total_policiais',
      )
      .addSelect('t.valor_total', 'valor_total_evento')
      .addSelect('t.updated_at', 'createdAt') // usa data de encerramento
      .where('t.sistema = :sistema', { sistema: 'PJES' })
      .andWhere('t.status = :status', { status: StatusTeto.ENCERRADO })
      .orderBy('t.updated_at', 'DESC')
      .getRawMany();

    // ── 3. Monta a lista com a OME principal de cada teto PJES ───────────────
    // Busca a OME do primeiro evento de cada teto para exibição
    const teto_ids = rowsPjes.map((r) => Number(r.eventoId));
    const omesPorTeto = new Map<number, string>();

    if (teto_ids.length > 0) {
      const omesRows = await this.eventoRepo
        .createQueryBuilder('ev')
        .select('d.teto_id', 'tetoId')
        .addSelect('ome.nomeOme', 'nomeOme')
        .innerJoin('ev.distribuicao', 'd')
        .innerJoin('ev.ome', 'ome')
        .where('d.teto_id IN (:...ids)', { ids: teto_ids })
        .groupBy('d.teto_id')
        .addGroupBy('ome.nomeOme')
        .getRawMany();

      // Pega a primeira OME encontrada por teto (pode haver mais de uma)
      for (const row of omesRows) {
        const tid = Number(row.tetoId);
        if (!omesPorTeto.has(tid)) {
          omesPorTeto.set(tid, row.nomeOme);
        }
      }
    }

    // ── 4. Formata resultados PJES com a OME correta ─────────────────────────
    const resultadosPjes = rowsPjes.map((r) => ({
      uid: `PJES-${r.eventoId}`,
      eventoId: Number(r.eventoId),
      nome_evento: r.nome_evento,
      nome_ome: omesPorTeto.get(Number(r.eventoId)) ?? r.nome_ome,
      sistema: 'PJES',
      nome_verba: r.nome_verba,
      total_policiais: Number(r.total_policiais),
      valor_total_evento: Number(r.valor_total_evento),
      createdAt: r.createdAt,
    }));

    // ── 5. Formata resultados DIARIAS ─────────────────────────────────────────
    const resultadosDiarias = rowsDiarias.map((r) => ({
      uid: `DIARIAS-${r.eventoId}`,
      eventoId: Number(r.eventoId),
      nome_evento: r.nome_evento,
      nome_ome: r.nome_ome,
      sistema: r.sistema,
      nome_verba: r.nome_verba,
      total_policiais: Number(r.total_policiais),
      valor_total_evento: Number(r.valor_total_evento),
      createdAt: r.createdAt,
    }));

    // ── 6. Unifica, ordena por data desc e aplica limit ───────────────────────
    const todos = [...resultadosPjes, ...resultadosDiarias].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return limit ? todos.slice(0, limit) : todos;
  }

  async findByEventoPaginado(
    eventoId: number,
    page: number,
    busca?: string,
  ): Promise<{ data: ReturnPagamentoDto[]; total: number }> {
    const PAGE_SIZE = 50;
    const skip = (page - 1) * PAGE_SIZE;

    const qb = this.repo
      .createQueryBuilder('p')
      .where('p.evento_id = :eventoId', { eventoId })
      .orderBy('p.nomeome_pagamento', 'ASC')
      .addOrderBy('p.nome_pagamento', 'ASC');

    if (busca?.trim()) {
      qb.andWhere('p.cpf_pagamento ILIKE :busca', {
        busca: `%${busca.trim()}%`,
      });
    }

    const [data, total] = await qb.skip(skip).take(PAGE_SIZE).getManyAndCount();

    return {
      data: data.map((p) => new ReturnPagamentoDto(p)),
      total,
    };
  }

  async atualizarPagamento(
    id: number,
    pgtrue: boolean,
    comentario_pagamento: string,
  ): Promise<ReturnPagamentoDto> {
    const pagamento = await this.repo.findOne({ where: { id } });
    if (!pagamento) throw new NotFoundException('Pagamento não encontrado');

    pagamento.pgtrue = pgtrue;
    pagamento.comentario_pagamento = comentario_pagamento ?? '';

    await this.repo.save(pagamento);
    return new ReturnPagamentoDto(pagamento);
  }

  async findAll(): Promise<ReturnPagamentoDto[]> {
    const pagamentos = await this.repo.find({
      relations: { evento: { ome: true } },
      order: { createdAt: 'DESC' },
    });
    return pagamentos.map((p) => new ReturnPagamentoDto(p));
  }

  async findOne(id: number): Promise<ReturnPagamentoDto> {
    const pagamento = await this.repo.findOne({
      where: { id },
      relations: { evento: { ome: true } },
    });
    if (!pagamento) throw new NotFoundException('Pagamento não encontrado');
    return new ReturnPagamentoDto(pagamento);
  }
}
