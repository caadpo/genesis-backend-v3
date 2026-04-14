// src/distribuicao/distribuicao.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Distribuicao } from './entities/distribuicao.entity';
import { Teto } from 'src/tetos/entities/teto.entity';
import { CreateDistribuicaoDto } from './dtos/create-distribuicao.dto';
import { DiretoriaEntity } from 'src/diretoria/entities/diretoria.entity';
import { ReturnDistribuicaoResumoDto } from './dtos/return-distribuicao.dto';
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class DistribuicaoService {
  constructor(
    @InjectRepository(Distribuicao)
    private readonly distribuicaoRepo: Repository<Distribuicao>,

    @InjectRepository(Teto)
    private readonly tetoRepo: Repository<Teto>,

    @InjectRepository(DiretoriaEntity)
    private readonly diretoriaRepo: Repository<DiretoriaEntity>,
  ) {}

  private async getResumoTeto(
    tetoId: number,
  ): Promise<ReturnDistribuicaoResumoDto> {
    const result = await this.distribuicaoRepo
      .createQueryBuilder('d')
      .select('COALESCE(SUM(d.qtd_dist_of), 0)', 'soma_of')
      .addSelect('COALESCE(SUM(d.qtd_dist_prc), 0)', 'soma_prc')
      .where('d.teto_id = :tetoId', { tetoId })
      .getRawOne();

    const teto = await this.tetoRepo.findOneBy({ id: tetoId });

    return {
      soma_of: Number(result.soma_of),
      soma_prc: Number(result.soma_prc),
      limite_of: Number(teto!.ttctof),
      limite_prc: Number(teto!.ttctprc),
    };
  }

  private async getResumoTetoParaUpdate(
    tetoId: number,
    distribuicaoId: number,
  ): Promise<ReturnDistribuicaoResumoDto> {
    const result = await this.distribuicaoRepo
      .createQueryBuilder('d')
      .select('COALESCE(SUM(d.qtd_dist_of), 0)', 'soma_of')
      .addSelect('COALESCE(SUM(d.qtd_dist_prc), 0)', 'soma_prc')
      .where('d.teto_id = :tetoId', { tetoId })
      .andWhere('d.id != :id', { id: distribuicaoId })
      .getRawOne();

    const teto = await this.tetoRepo.findOneBy({ id: tetoId });

    return {
      soma_of: Number(result.soma_of),
      soma_prc: Number(result.soma_prc),
      limite_of: Number(teto!.ttctof),
      limite_prc: Number(teto!.ttctprc),
    };
  }

  async create(dto: CreateDistribuicaoDto): Promise<Distribuicao> {
    const teto = await this.tetoRepo.findOneBy({ id: dto.teto_id });
    if (!teto) throw new NotFoundException('Teto não encontrado');

    const diretoria = await this.diretoriaRepo.findOneBy({
      id: dto.diretoria_id,
    });
    if (!diretoria) throw new NotFoundException('Diretoria não encontrada');

    const resumo = await this.getResumoTeto(dto.teto_id);

    if (resumo.soma_of + dto.qtd_dist_of > resumo.limite_of) {
      throw new BadRequestException(
        'Quantidade OF ultrapassa o teto disponível',
      );
    }

    if (resumo.soma_prc + dto.qtd_dist_prc > resumo.limite_prc) {
      throw new BadRequestException(
        'Quantidade PRC ultrapassa o teto disponível',
      );
    }

    const distribuicao = this.distribuicaoRepo.create({
      teto,
      diretoria,
      qtd_dist_of: dto.qtd_dist_of,
      qtd_dist_prc: dto.qtd_dist_prc,
    });

    return this.distribuicaoRepo.save(distribuicao);
  }

  findAll(): Promise<Distribuicao[]> {
    return this.distribuicaoRepo.find({
      relations: ['teto', 'diretoria'],
    });
  }

  async findByTeto(tetoId: number): Promise<Distribuicao[]> {
    return this.distribuicaoRepo.find({
      where: {
        teto: { id: tetoId },
      },
      relations: ['teto', 'diretoria'],
    });
  }

  async findOne(id: number): Promise<Distribuicao> {
    const dist = await this.distribuicaoRepo.findOne({
      where: { id },
      relations: ['teto', 'diretoria'],
    });

    if (!dist) throw new NotFoundException('Distribuição não encontrada');
    return dist;
  }

  async update(id: number, dto: Partial<CreateDistribuicaoDto>) {
    const distribuicao = await this.findOne(id);

    if (dto.teto_id) {
      const teto = await this.tetoRepo.findOneBy({ id: dto.teto_id });
      distribuicao.teto = teto!;
    }

    if (dto.diretoria_id) {
      const diretoria = await this.diretoriaRepo.findOneBy({
        id: dto.diretoria_id,
      });
      distribuicao.diretoria = diretoria!;
    }

    if (dto.qtd_dist_of !== undefined) {
      distribuicao.qtd_dist_of = dto.qtd_dist_of;
    }

    if (dto.qtd_dist_prc !== undefined) {
      distribuicao.qtd_dist_prc = dto.qtd_dist_prc;
    }

    const resumo = await this.getResumoTetoParaUpdate(distribuicao.teto.id, id);

    const novoOf = dto.qtd_dist_of ?? distribuicao.qtd_dist_of;
    const novoPrc = dto.qtd_dist_prc ?? distribuicao.qtd_dist_prc;

    if (resumo.soma_of + novoOf > resumo.limite_of) {
      throw new BadRequestException(
        'Quantidade OF ultrapassa o teto disponível',
      );
    }

    if (resumo.soma_prc + novoPrc > resumo.limite_prc) {
      throw new BadRequestException(
        'Quantidade PRC ultrapassa o teto disponível',
      );
    }

    return this.distribuicaoRepo.save(distribuicao);
  }

  async remove(id: number) {
    await this.distribuicaoRepo.delete(id);
  }
}
