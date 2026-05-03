import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sistema, Teto } from './entities/teto.entity';
import { StatusTeto } from './enum/teto-type.enum';

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
      valor_total: Number(t.valor_total), // ← aqui estava o bug
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

  async create(dados: Partial<Teto>) {
    const teto = this.tetoRepository.create(dados);
    const saved = await this.tetoRepository.save(teto);
    return this.toJSON(saved);
  }

  // 🔵 PJES → depende de mês/ano e status
  async findPjesPorMes(mes: number, ano: number) {
    const inicioMes = new Date(ano, mes - 1, 1);
    const fimMes = new Date(ano, mes, 0);

    const tetos = await this.tetoRepository
      .createQueryBuilder('t')
      .where('t.sistema = :sistema', { sistema: Sistema.PJES })
      .andWhere('t.status = :status', { status: StatusTeto.ABERTO })
      .andWhere(
        `t.data_inicio <= :fimMes
         AND t.data_fim >= :inicioMes`,
        { inicioMes, fimMes },
      )
      .orderBy('t.nome_verba', 'ASC')
      .getMany();

    return tetos.map((t) => this.toJSON(t));
  }

  // 🟢 DIÁRIAS → NÃO USA DATA, SÓ STATUS
  async findDiariasAbertas() {
    const tetos = await this.tetoRepository.find({
      where: {
        sistema: Sistema.DIARIAS,
        status: StatusTeto.ABERTO,
      },
      order: { nome_verba: 'ASC' },
    });

    return tetos.map((t) => this.toJSON(t));
  }

  async findOne(id: number) {
    const teto = await this.tetoRepository.findOneBy({ id });

    if (!teto) {
      throw new NotFoundException(`Teto com ID ${id} não encontrado`);
    }

    return this.toJSON(teto);
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
