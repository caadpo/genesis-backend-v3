import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { Sistema, Teto } from './entities/teto.entity';

@Injectable()
export class TetoService {
  constructor(
    @InjectRepository(Teto)
    private readonly tetoRepository: Repository<Teto>,
  ) {}

  create(teto: Partial<Teto>): Promise<Teto> {
    const novoTeto = this.tetoRepository.create(teto);
    return this.tetoRepository.save(novoTeto);
  }

  async findAll(sistema?: string, mes?: string, ano?: string): Promise<Teto[]> {
    const qb = this.tetoRepository.createQueryBuilder('teto');

    if (sistema) {
      qb.andWhere('teto.sistema = :sistema', {
        sistema: sistema as Sistema,
      });
    }

    // 🔥 Se vier mês/ano → filtra pelo período do mês
    if (mes && ano) {
      const mesNum = Number(mes);
      const anoNum = Number(ano);

      const inicioMes = new Date(anoNum, mesNum - 1, 1);
      const fimMes = new Date(anoNum, mesNum, 0);

      qb.andWhere(
        `
        teto.data_inicio <= :fimMes
        AND teto.data_fim >= :inicioMes
        `,
        { inicioMes, fimMes },
      );
    }

    return qb.orderBy('teto.nome_verba', 'ASC').getMany();
  }

  async findOne(id: number): Promise<Teto> {
    const teto = await this.tetoRepository.findOneBy({ id });
    if (!teto) {
      throw new NotFoundException(`Teto com ID ${id} não encontrado`);
    }
    return teto;
  }

  async update(id: number, dados: Partial<Teto>): Promise<Teto> {
    await this.tetoRepository.update(id, dados);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.tetoRepository.delete(id);
  }
}
