import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sistema, Teto } from './entities/teto.entity';
import { StatusTeto } from './enum/teto-type.enum';
import { EscalaEntity } from 'src/escala/entities/escala.entity';
import { ReturnTetoDto } from './dtos/return-teto.dto';

@Injectable()
export class TetoService {
  constructor(
    @InjectRepository(Teto)
    private readonly tetoRepository: Repository<Teto>,
  ) {}

  // 🔥 Mapper obrigatório quando usa Next como proxy
  private toJSON(t: Teto) {
    return {
      id: t.id,
      imagemUrl: t.imagemUrl,
      sistema: t.sistema,
      nome_verba: t.nome_verba,
      cod_verba: t.cod_verba,
      valor_total: Number(t.valor_total),
      ttctof: t.ttctof,
      ttctprc: t.ttctprc,
      data_inicio: t.data_inicio,
      data_fim: t.data_fim,
      tipo_periodo: t.tipo_periodo,
      status: t.status,
      created_at: t.created_at,
      updated_at: t.updated_at,
    };
  }

  private mapRawTeto(raw: any): ReturnTetoDto {
    const base = {
      id: raw.id,
      imagemUrl: raw.imagemUrl,
      sistema: raw.sistema,
      nome_verba: raw.nome_verba,
      cod_verba: raw.cod_verba,
      valor_total: Number(raw.valor_total),
      ttctof: Number(raw.ttctof),
      ttctprc: Number(raw.ttctprc),
      data_inicio: raw.data_inicio,
      data_fim: raw.data_fim,
      tipo_periodo: raw.tipo_periodo,
      status: raw.status,
      created_at: raw.created_at,
      updated_at: raw.updated_at,
    };

    const qtd_dist_of = Number(raw.qtd_dist_of ?? 0);
    const qtd_dist_prc = Number(raw.qtd_dist_prc ?? 0);
    const totalCotasOficiais = Number(raw.totalCotasOficiais ?? 0);
    const totalCotasPracas = Number(raw.totalCotasPracas ?? 0);

    return {
      ...base,
      qtd_dist_of,
      qtd_dist_prc,
      saldo_of: Number(base.ttctof) - qtd_dist_of,
      saldo_prc: Number(base.ttctprc) - qtd_dist_prc,
      totalCotasOficiais,
      totalCotasPracas,
    };
  }

  private buildTetoQuery() {
    return (
      this.tetoRepository
        .createQueryBuilder('t')
        .select('t.id', 'id')
        .addSelect('t.imagem_url', 'imagemUrl')
        .addSelect('t.sistema', 'sistema')
        .addSelect('t.nome_verba', 'nome_verba')
        .addSelect('t.cod_verba', 'cod_verba')
        .addSelect('t.valor_total', 'valor_total')
        .addSelect('t.ttctof', 'ttctof')
        .addSelect('t.ttctprc', 'ttctprc')
        .addSelect('t.data_inicio', 'data_inicio')
        .addSelect('t.data_fim', 'data_fim')
        .addSelect('t.tipo_periodo', 'tipo_periodo')
        .addSelect('t.status', 'status')
        .addSelect('t.created_at', 'created_at')
        .addSelect('t.updated_at', 'updated_at')
        // ✅ tipo_escala agora é coluna snapshot na própria tabela escala — sem join com dadosSgp
        .addSelect(
          (subQuery) =>
            subQuery
              .select('COALESCE(SUM(e.cota_escala), 0)')
              .from(EscalaEntity, 'e')
              .innerJoin('e.operacao', 'op')
              .innerJoin('op.evento', 'ev')
              .innerJoin('ev.distribuicao', 'd')
              .where('e.tipo_escala = :tipoOf', { tipoOf: 'O' })
              .andWhere('d.teto_id = t.id'),
          'totalCotasOficiais',
        )
        .addSelect(
          (subQuery) =>
            subQuery
              .select('COALESCE(SUM(e.cota_escala), 0)')
              .from(EscalaEntity, 'e')
              .innerJoin('e.operacao', 'op')
              .innerJoin('op.evento', 'ev')
              .innerJoin('ev.distribuicao', 'd')
              .where('e.tipo_escala = :tipoPrc', { tipoPrc: 'P' })
              .andWhere('d.teto_id = t.id'),
          'totalCotasPracas',
        )
    );
  }

  async create(dados: Partial<Teto>) {
    const teto = this.tetoRepository.create(dados);
    const saved = await this.tetoRepository.save(teto);
    return this.toJSON(saved);
  }

  // 🔵 PJES → depende de mês/ano e status
  async findPjesPorMes(mes: number, ano: number): Promise<ReturnTetoDto[]> {
    const inicioMes = new Date(ano, mes - 1, 1);
    const fimMes = new Date(ano, mes, 0);

    const tetos = await this.buildTetoQuery()
      .where('t.sistema = :sistema', { sistema: Sistema.PJES })
      .andWhere(
        `t.data_inicio <= :fimMes
         AND t.data_fim >= :inicioMes`,
        { inicioMes, fimMes },
      )
      .orderBy('t.nome_verba', 'ASC')
      .getRawMany();

    return tetos.map((raw) => this.mapRawTeto(raw));
  }

  // 🟢 DIÁRIAS → NÃO USA DATA, SÓ STATUS
  async findDiariasAbertas(): Promise<ReturnTetoDto[]> {
    const tetos = await this.buildTetoQuery()
      .where('t.sistema = :sistema', { sistema: Sistema.DIARIAS })
      .andWhere('t.status = :status', { status: StatusTeto.ABERTO })
      .orderBy('t.nome_verba', 'ASC')
      .getRawMany();

    return tetos.map((raw) => this.mapRawTeto(raw));
  }

  async findOne(id: number): Promise<ReturnTetoDto> {
    const rawTeto = await this.buildTetoQuery()
      .where('t.id = :id', { id })
      .getRawOne();

    if (!rawTeto) {
      throw new NotFoundException(`Teto com ID ${id} não encontrado`);
    }

    return this.mapRawTeto(rawTeto);
  }

  async update(id: number, dados: Partial<Teto>) {
    await this.tetoRepository.update(id, dados);
    return this.findOne(id);
  }

  async encerrar(id: number) {
    await this.tetoRepository.update(id, {
      status: StatusTeto.ENCERRADO,
    });
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.tetoRepository.delete(id);
  }
}
