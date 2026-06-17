import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Distribuicao } from './entities/distribuicao.entity';
import { Teto } from 'src/tetos/entities/teto.entity';
import { CreateDistribuicaoDto } from './dtos/create-distribuicao.dto';
import { DiretoriaEntity } from 'src/diretoria/entities/diretoria.entity';
import { ReturnDistribuicaoResumoDto } from './dtos/return-distribuicao.dto';
import { ReturnDistribuicaoComTotalCotasDto } from './dtos/return-distribuicao-com-total-cotas.dto';
import { BadRequestException } from '@nestjs/common';
import { UserType } from 'src/user/enum/user-type.enum';
import { UserEntity } from 'src/user/entities/user.entity';
import { EscalaEntity } from 'src/escala/entities/escala.entity';
import { Evento } from 'src/evento/entities/evento.entity';

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

    @InjectRepository(EscalaEntity)
    private readonly escalaRepo: Repository<EscalaEntity>,

    @InjectRepository(Evento)
    private readonly eventoRepo: Repository<Evento>,
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
      const teto = await manager.findOne(Teto, {
        where: { id: dto.teto_id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!teto) throw new NotFoundException('Teto não encontrado');

      this.validarTetoAberto(teto);

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

  private async getTotalCotasPorTipoDistribuicao(
    distId: number,
    omeId?: number,
  ) {
    const qb = this.escalaRepo
      .createQueryBuilder('e')
      .select('e.tipo_escala', 'tipo_escala')
      .addSelect('COALESCE(SUM(e.cota_escala), 0)', 'totalCotas')
      .innerJoin('e.operacao', 'op')
      .innerJoin('op.evento', 'ev')
      .where('ev.distribuicao_id = :distId', { distId });

    if (omeId) {
      qb.andWhere('op.ome_id = :omeId', { omeId });
    }

    const rows = await qb.groupBy('e.tipo_escala').getRawMany();

    return rows.map((r) => ({
      tipo_escala: r.tipo_escala,
      totalCotas: Number(r.totalCotas),
    }));
  }

  // distribuicao.service.ts — findOmesPorDistribuicao
  async findOmesPorDistribuicao(
    distribuicaoId: number,
    user: UserEntity,
  ): Promise<
    {
      omeId: number;
      nomeOme: string;
      soma_of: number; // qtd destinada (eventos)
      soma_prc: number;
      cotas_of: number; // consumo real (escalas)
      cotas_prc: number;
    }[]
  > {
    const userCompleto = await this.getUserCompleto(user.id);
    const isAuxiliar = Number(userCompleto.typeUser) === UserType.AUXILIAR;

    // Query 1: soma de qtd_of_evento / qtd_prc_evento por OME
    const qbEventos = this.eventoRepo
      .createQueryBuilder('e')
      .select('o.id', 'omeId')
      .addSelect('o.nomeOme', 'nomeOme')
      .addSelect('COALESCE(SUM(e.qtd_of_evento), 0)', 'soma_of')
      .addSelect('COALESCE(SUM(e.qtd_prc_evento), 0)', 'soma_prc')
      .innerJoin('e.ome', 'o')
      .where('e.distribuicao_id = :distribuicaoId', { distribuicaoId });

    if (isAuxiliar) {
      qbEventos.andWhere('e.ome_id = :omeId', { omeId: userCompleto.ome.id });
    }

    const rowsEventos = await qbEventos
      .groupBy('o.id')
      .addGroupBy('o.nomeOme')
      .orderBy('o.nomeOme', 'ASC')
      .getRawMany();

    // Query 2: soma de cota_escala por OME (consumo real)
    const omeIds = rowsEventos.map((r) => Number(r.omeId));
    if (!omeIds.length) return [];

    const rowsCotas = await this.escalaRepo
      .createQueryBuilder('e')
      .select('op.ome_id', 'omeId')
      .addSelect('e.tipo_escala', 'tipo')
      .addSelect('COALESCE(SUM(e.cota_escala), 0)', 'total')
      .innerJoin('e.operacao', 'op')
      .innerJoin('op.evento', 'ev')
      .where('ev.distribuicao_id = :distribuicaoId', { distribuicaoId })
      .andWhere('op.ome_id IN (:...omeIds)', { omeIds })
      .groupBy('op.ome_id')
      .addGroupBy('e.tipo_escala')
      .getRawMany();

    // Monta mapa omeId → { cotas_of, cotas_prc }
    const cotasMap = new Map<number, { cotas_of: number; cotas_prc: number }>();
    for (const r of rowsCotas) {
      const id = Number(r.omeId);
      if (!cotasMap.has(id)) cotasMap.set(id, { cotas_of: 0, cotas_prc: 0 });
      if (r.tipo === 'O') cotasMap.get(id)!.cotas_of = Number(r.total);
      if (r.tipo === 'P') cotasMap.get(id)!.cotas_prc = Number(r.total);
    }

    return rowsEventos.map((r) => {
      const id = Number(r.omeId);
      const cotas = cotasMap.get(id) ?? { cotas_of: 0, cotas_prc: 0 };
      return {
        omeId: id,
        nomeOme: r.nomeOme,
        soma_of: Number(r.soma_of),
        soma_prc: Number(r.soma_prc),
        cotas_of: cotas.cotas_of,
        cotas_prc: cotas.cotas_prc,
      };
    });
  }

  private async getSomaEventosDistribuicao(distId: number, omeId?: number) {
    const qb = this.eventoRepo
      .createQueryBuilder('e')
      .select('COALESCE(SUM(e.qtd_of_evento), 0)', 'soma_of')
      .addSelect('COALESCE(SUM(e.qtd_prc_evento), 0)', 'soma_prc')
      .where('e.distribuicao_id = :distId', { distId });

    if (omeId) {
      qb.andWhere('e.ome_id = :omeId', { omeId });
    }

    const result = await qb.getRawOne();

    return {
      soma_of: Number(result.soma_of),
      soma_prc: Number(result.soma_prc),
    };
  }

  async findAllComRegra(
    tetoId: number | undefined,
    user: UserEntity,
  ): Promise<ReturnDistribuicaoComTotalCotasDto[]> {
    const userCompleto = await this.getUserCompleto(user.id);

    const qb = this.distribuicaoRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.teto', 't')
      .leftJoinAndSelect('d.diretoria', 'dir');

    if (tetoId) {
      qb.andWhere('t.id = :tetoId', { tetoId });
    }

    if (userCompleto.typeUser === UserType.GESTOR_VERBA) {
      // Vê apenas distribuições da sua diretoria
      qb.andWhere('dir.id = :diretoriaId', {
        diretoriaId: userCompleto.ome.diretoria.id,
      });
    }

    if (userCompleto.typeUser === UserType.DIRETOR) {
      // ✅ Vê distribuições da sua diretoria OU distribuições que têm eventos para suas OMEs
      qb.leftJoin('d.eventos', 'ev')
        .leftJoin('ev.ome', 'ome_ev')
        .leftJoin('ome_ev.diretoria', 'dir_ome_ev')
        .andWhere('(dir.id = :diretoriaId OR dir_ome_ev.id = :diretoriaId)', {
          diretoriaId: userCompleto.ome.diretoria.id,
        });
    }

    if (userCompleto.typeUser === UserType.AUXILIAR) {
      // ✅ Vê distribuições da sua diretoria OU distribuições que têm eventos para sua OME
      qb.leftJoin('d.eventos', 'ev')
        .leftJoin('ev.ome', 'ome_ev')
        .andWhere('(dir.id = :diretoriaId OR ome_ev.id = :omeId)', {
          diretoriaId: userCompleto.ome.diretoria.id,
          omeId: userCompleto.ome.id,
        });
    }

    const distribs = await qb.distinct(true).getMany();

    const isAuxiliar = userCompleto.typeUser === UserType.AUXILIAR;
    const omeId = isAuxiliar ? userCompleto.ome?.id : undefined;

    return Promise.all(
      distribs.map(async (dist) => {
        const cotasPorTipo = await this.getTotalCotasPorTipoDistribuicao(
          dist.id,
          omeId,
        );
        const eventosSoma = await this.getSomaEventosDistribuicao(
          dist.id,
          omeId,
        );

        return new ReturnDistribuicaoComTotalCotasDto(
          dist,
          cotasPorTipo,
          eventosSoma.soma_of,
          eventosSoma.soma_prc,
        );
      }),
    );
  }

  async findByTeto(tetoId: number): Promise<Distribuicao[]> {
    return this.distribuicaoRepo.find({
      where: {
        teto: { id: tetoId },
      },
      relations: ['teto', 'diretoria'],
    });
  }

  async findOne(
    id: number,
    user?: UserEntity,
  ): Promise<ReturnDistribuicaoComTotalCotasDto> {
    const dist = await this.distribuicaoRepo.findOne({
      where: { id },
      relations: ['teto', 'diretoria'],
    });

    if (!dist) throw new NotFoundException('Distribuição não encontrada');

    const userCompleto = user ? await this.getUserCompleto(user.id) : null;
    const isAuxiliar =
      userCompleto && Number(userCompleto.typeUser) === UserType.AUXILIAR;
    const omeId = isAuxiliar ? userCompleto.ome?.id : undefined;

    const cotasPorTipo = await this.getTotalCotasPorTipoDistribuicao(
      dist.id,
      omeId,
    );
    const eventosSoma = await this.getSomaEventosDistribuicao(dist.id, omeId);

    return new ReturnDistribuicaoComTotalCotasDto(
      dist,
      cotasPorTipo,
      eventosSoma.soma_of,
      eventosSoma.soma_prc,
    );
  }

  async update(id: number, dto: Partial<CreateDistribuicaoDto>) {
    return this.distribuicaoRepo.manager.transaction(async (manager) => {
      const distribuicao = await manager
        .createQueryBuilder(Distribuicao, 'd')
        .innerJoinAndSelect('d.teto', 't')
        .where('d.id = :id', { id })
        .setLock('pessimistic_write')
        .getOne();

      if (!distribuicao)
        throw new NotFoundException('Distribuição não encontrada');

      this.validarTetoAberto(distribuicao.teto);

      const novoOf = dto.qtd_dist_of ?? distribuicao.qtd_dist_of;
      const novoPrc = dto.qtd_dist_prc ?? distribuicao.qtd_dist_prc;

      // ✅ Impede reduzir abaixo da soma já distribuída nos eventos
      const eventosSoma = await this.getSomaEventosDistribuicao(id);

      if (novoOf < eventosSoma.soma_of) {
        throw new BadRequestException(
          `Qtd. de oficiais (${novoOf}) não pode ser menor que a soma já distribuída nos eventos (${eventosSoma.soma_of}).`,
        );
      }
      if (novoPrc < eventosSoma.soma_prc) {
        throw new BadRequestException(
          `Qtd. de praças (${novoPrc}) não pode ser menor que a soma já distribuída nos eventos (${eventosSoma.soma_prc}).`,
        );
      }

      // Validação contra o teto (já existia)
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

      if (dto.nome_dist !== undefined) {
        distribuicao.nome_dist = dto.nome_dist;
      }

      if (dto.diretoria_id !== undefined) {
        const diretoriaExiste = await manager.exists(DiretoriaEntity, {
          where: { id: dto.diretoria_id },
        });

        if (!diretoriaExiste) {
          throw new NotFoundException('Diretoria não encontrada');
        }

        distribuicao.diretoria = { id: dto.diretoria_id } as DiretoriaEntity;
      }

      return manager.save(distribuicao);
    });
  }

  async remove(id: number) {
    return this.distribuicaoRepo.manager.transaction(async (manager) => {
      const dist = await manager
        .createQueryBuilder(Distribuicao, 'd')
        .innerJoinAndSelect('d.teto', 't')
        .where('d.id = :id', { id })
        .setLock('pessimistic_write')
        .getOne();

      if (!dist) throw new NotFoundException('Distribuição não encontrada');

      this.validarTetoAberto(dist.teto);

      await manager.delete(Distribuicao, id);
    });
  }
}
