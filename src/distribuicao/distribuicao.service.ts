// src/distribuicao/distribuicao.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Distribuicao } from './entities/distribuicao.entity';
import { Teto } from 'src/tetos/entities/teto.entity';
import { CreateDistribuicaoDto } from './dtos/create-distribuicao.dto';
import { DiretoriaEntity } from 'src/diretoria/entities/diretoria.entity';

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

  async create(dto: CreateDistribuicaoDto): Promise<Distribuicao> {
    const teto = await this.tetoRepo.findOneBy({ id: dto.teto_id });
    if (!teto) throw new NotFoundException('Teto não encontrado');

    const diretoria = await this.diretoriaRepo.findOneBy({
      id: dto.diretoria_id,
    });
    if (!diretoria) throw new NotFoundException('Diretoria não encontrada');

    const distribuicao = this.distribuicaoRepo.create({
      teto,
      diretoria,
      qtd_oficiais: dto.qtd_oficiais,
      qtd_pracas: dto.qtd_pracas,
      valor_total: dto.valor_total,
    });

    return this.distribuicaoRepo.save(distribuicao);
  }

  findAll(): Promise<Distribuicao[]> {
    return this.distribuicaoRepo.find({
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
    await this.distribuicaoRepo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.distribuicaoRepo.delete(id);
  }
}
