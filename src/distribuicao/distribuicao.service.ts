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
import { UserType } from 'src/user/enum/user-type.enum';
import { UserEntity } from 'src/user/entities/user.entity';

@Injectable()
export class DistribuicaoService {
  constructor(
    @InjectRepository(Distribuicao)
    private readonly distribuicaoRepo: Repository<Distribuicao>,

    @InjectRepository(Teto)
    private readonly tetoRepo: Repository<Teto>,

    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,

    @InjectRepository(DiretoriaEntity)
    private readonly diretoriaRepo: Repository<DiretoriaEntity>,
  ) {}

  private async getUserCompleto(userId: number): Promise<UserEntity> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['ome', 'ome.diretoria'],
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }

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

  private validarTetoAberto(teto: Teto) {
    if (teto.status === 'ENCERRADO') {
      throw new BadRequestException(
        'Este Teto está ENCERRADO. Não é permitido alterar suas distribuições.',
      );
    }
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
    return this.distribuicaoRepo.manager.transaction(async (manager) => {
      // 🔒 trava o teto
      const teto = await manager.findOne(Teto, {
        where: { id: dto.teto_id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!teto) throw new NotFoundException('Teto não encontrado');

      this.validarTetoAberto(teto);

      // 🔥 recalcula o resumo DENTRO da transação
      const result = await manager
        .createQueryBuilder(Distribuicao, 'd')
        .select('COALESCE(SUM(d.qtd_dist_of), 0)', 'soma_of')
        .addSelect('COALESCE(SUM(d.qtd_dist_prc), 0)', 'soma_prc')
        .where('d.teto_id = :tetoId', { tetoId: dto.teto_id })
        .getRawOne();

      const soma_of = Number(result.soma_of);
      const soma_prc = Number(result.soma_prc);

      if (soma_of + dto.qtd_dist_of > teto.ttctof) {
        throw new BadRequestException('OF ultrapassa o teto');
      }

      if (soma_prc + dto.qtd_dist_prc > teto.ttctprc) {
        throw new BadRequestException('PRC ultrapassa o teto');
      }

      const diretoriaExiste = await manager.exists(DiretoriaEntity, {
        where: { id: dto.diretoria_id },
      });

      if (!diretoriaExiste) {
        throw new NotFoundException('Diretoria não encontrada');
      }

      const distribuicao = manager.create(Distribuicao, {
        teto: { id: teto.id },
        diretoria: { id: dto.diretoria_id },
        nome_dist: dto.nome_dist,
        qtd_dist_of: dto.qtd_dist_of,
        qtd_dist_prc: dto.qtd_dist_prc,
      });

      return manager.save(distribuicao);
    });
  }

  findAll(): Promise<Distribuicao[]> {
    return this.distribuicaoRepo.find({
      relations: ['teto', 'diretoria'],
    });
  }

  async findAllComRegra(
    tetoId: number | undefined,
    user: UserEntity,
  ): Promise<Distribuicao[]> {
    const userCompleto = await this.getUserCompleto(user.id);

    const qb = this.distribuicaoRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.teto', 't')
      .leftJoinAndSelect('d.diretoria', 'dir');

    if (tetoId) {
      qb.andWhere('t.id = :tetoId', { tetoId });
    }

    // 🔥 REGRA DE VISUALIZAÇÃO CORRETA

    if (userCompleto.typeUser === UserType.DIRETOR) {
      qb.andWhere('dir.id = :diretoriaId', {
        diretoriaId: userCompleto.ome.diretoria.id,
      });
    }

    if (userCompleto.typeUser === UserType.AUXILIAR) {
      qb.andWhere('dir.id = :diretoriaId', {
        diretoriaId: userCompleto.ome.diretoria.id,
      });
    }

    return qb.getMany();
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
    return this.distribuicaoRepo.manager.transaction(async (manager) => {
      const distribuicao = await manager.findOne(Distribuicao, {
        where: { id },
        relations: ['teto'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!distribuicao)
        throw new NotFoundException('Distribuição não encontrada');

      this.validarTetoAberto(distribuicao.teto);

      const novoOf = dto.qtd_dist_of ?? distribuicao.qtd_dist_of;
      const novoPrc = dto.qtd_dist_prc ?? distribuicao.qtd_dist_prc;

      const result = await manager
        .createQueryBuilder(Distribuicao, 'd')
        .select('COALESCE(SUM(d.qtd_dist_of), 0)', 'soma_of')
        .addSelect('COALESCE(SUM(d.qtd_dist_prc), 0)', 'soma_prc')
        .where('d.teto_id = :tetoId', { tetoId: distribuicao.teto.id })
        .andWhere('d.id != :id', { id })
        .getRawOne();

      const soma_of = Number(result.soma_of);
      const soma_prc = Number(result.soma_prc);

      if (soma_of + novoOf > distribuicao.teto.ttctof) {
        throw new BadRequestException('OF ultrapassa o teto');
      }

      if (soma_prc + novoPrc > distribuicao.teto.ttctprc) {
        throw new BadRequestException('PRC ultrapassa o teto');
      }

      distribuicao.qtd_dist_of = novoOf;
      distribuicao.qtd_dist_prc = novoPrc;

      return manager.save(distribuicao);
    });
  }

  async remove(id: number) {
    return this.distribuicaoRepo.manager.transaction(async (manager) => {
      const dist = await manager.findOne(Distribuicao, {
        where: { id },
        relations: ['teto'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!dist) throw new NotFoundException('Distribuição não encontrada');

      this.validarTetoAberto(dist.teto);

      await manager.delete(Distribuicao, id);
    });
  }
}
