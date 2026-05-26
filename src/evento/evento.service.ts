import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Evento } from './entities/evento.entity';
import { Distribuicao } from 'src/distribuicao/entities/distribuicao.entity';
import { OmeEntity } from 'src/ome/entities/ome.entity';
import { CreateEventoDto } from './dtos/create-evento.dto';
import { UpdateEventoDto } from './dtos/update-evento.dto';
import { UserEntity } from 'src/user/entities/user.entity';
import { ReturnEventoDto } from './dtos/return-evento.dto';
import { StatusEvento } from './enum/eventos-status.enum';
import { UserType } from 'src/user/enum/user-type.enum';
import { EscalaEntity } from 'src/escala/entities/escala.entity';
import {
  ReturnEventoComEscalasDto,
  UsuarioResumoEscalaDto,
} from './dtos/return-evento-com-escalas.dto';
import { Operacao } from 'src/operacao/entities/operacao.entity';
import {
  ReturnEventoComTotalCotasDto,
  TotalCotasPorTipo,
} from './dtos/return-evento-com-total-cotas.dto';

@Injectable()
export class EventoService {
  constructor(
    @InjectRepository(Evento)
    private readonly eventoRepo: Repository<Evento>,

    @InjectRepository(Distribuicao)
    private readonly distribuicaoRepo: Repository<Distribuicao>,

    @InjectRepository(Operacao)
    private readonly operacaoRepo: Repository<Operacao>,

    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,

    @InjectRepository(OmeEntity)
    private readonly omeRepo: Repository<OmeEntity>,

    @InjectRepository(EscalaEntity)
    private readonly escalaRepo: Repository<EscalaEntity>,
  ) {}

  // ─── getResumoEscalas ────────────────────────────────────────────────────────
  async getResumoEscalas(eventoId: number): Promise<ReturnEventoComEscalasDto> {
    const evento = await this.eventoRepo.findOne({
      where: { id: eventoId },
      relations: [
        'ome',
        'user',
        'distribuicao',
        'distribuicao.teto',
        'homologado_por',
        'pd_concluida_por',
        'pago_por',
      ],
    });
    if (!evento) throw new NotFoundException('Evento não encontrado');

    // ✅ Todos os campos de identificação do policial vêm das colunas snapshot
    //    da própria tabela escala — sem join com dadosSgp
    const rows = await this.escalaRepo
      .createQueryBuilder('e')
      .select('e.usuario_id', 'usuarioId')
      .addSelect('e.mat_escala', 'mat')
      .addSelect('e.pg_escala', 'pg')
      .addSelect('e.nomecompleto_escala', 'nomeCompleto')
      .addSelect('e.nomeome_escala', 'nomeOme')
      .addSelect('u.phone', 'phone')
      .addSelect('e.cpf_escala', 'cpf')
      .addSelect('e.tipo_escala', 'tipo')
      .addSelect('e.nunfunc_escala', 'nunfunc')
      .addSelect('e.nunvinc_escala', 'nunvinc')
      .addSelect('c.banco', 'banco')
      .addSelect('c.agencia', 'agencia')
      .addSelect('c.conta', 'conta')
      .addSelect('COALESCE(SUM(e.cota_escala), 0)', 'totalCotas')
      .innerJoin('e.operacao', 'op')
      .innerJoin('op.evento', 'ev')
      .innerJoin('e.usuario', 'u') // ✅ apenas para phone (não existe no snapshot)
      .leftJoin('e.conta', 'c') // ✅ left join para dados bancários (nullable)
      .where('ev.id = :eventoId', { eventoId })
      .groupBy('e.usuario_id')
      .addGroupBy('e.mat_escala')
      .addGroupBy('e.pg_escala')
      .addGroupBy('e.nomecompleto_escala')
      .addGroupBy('e.nomeome_escala')
      .addGroupBy('u.phone')
      .addGroupBy('e.cpf_escala')
      .addGroupBy('e.tipo_escala')
      .addGroupBy('e.nunfunc_escala')
      .addGroupBy('e.nunvinc_escala')
      .addGroupBy('c.banco')
      .addGroupBy('c.agencia')
      .addGroupBy('c.conta')
      .orderBy('e.nomeome_escala', 'ASC')
      .addOrderBy('e.pg_escala', 'ASC')
      .addOrderBy('e.nomecompleto_escala', 'ASC')
      .getRawMany();

    // ✅ tipo_escala lido diretamente da coluna snapshot — sem join com dadosSgp
    const rowsComTipo = await this.escalaRepo
      .createQueryBuilder('e')
      .select('e.tipo_escala', 'tipo')
      .addSelect('COALESCE(SUM(e.cota_escala), 0)', 'soma')
      .innerJoin('e.operacao', 'op')
      .innerJoin('op.evento', 'ev')
      .where('ev.id = :eventoId', { eventoId })
      .groupBy('e.tipo_escala')
      .getRawMany();

    // ✅ Nomes dos responsáveis via campos snapshot das próprias escalas;
    //    para quem não escalou (criador do evento, etc.) montamos via pg+ng direto do user
    const matsResponsaveis = [
      evento.user?.mat,
      evento.homologado_por?.mat,
      evento.pd_concluida_por?.mat,
      evento.pago_por?.mat,
    ].filter(Boolean) as string[];

    const nomeMap = await this.buildNomeMapFromEscala(
      eventoId,
      matsResponsaveis,
    );

    const somaOf = Number(rowsComTipo.find((r) => r.tipo === 'O')?.soma ?? 0);
    const somaPrc = Number(rowsComTipo.find((r) => r.tipo === 'P')?.soma ?? 0);

    const usuariosDto: UsuarioResumoEscalaDto[] = rows.map((r) => ({
      usuarioId: Number(r.usuarioId),
      mat: String(r.mat),
      pg: r.pg ?? '-',
      nomeGuerra: r.nomeGuerra ?? '-',
      nomeCompleto: r.nomeCompleto ?? '-',
      nomeOme: r.nomeOme ?? '-',
      phone: r.phone ?? '-',
      cpf: r.cpf ?? '-',
      tipo: r.tipo ?? '-',
      nunfunc: r.nunfunc ?? '-',
      nunvinc: r.nunvinc ?? '-',
      banco: r.banco ?? '-',
      agencia: r.agencia ?? '-',
      conta: r.conta ?? '-',
      totalCotas: Number(r.totalCotas),
    }));

    const teto = evento.distribuicao?.teto;

    return {
      id: evento.id,
      nome_evento: evento.nome_evento,
      qtd_of_evento: evento.qtd_of_evento,
      qtd_prc_evento: evento.qtd_prc_evento,
      status_evento: evento.status_evento,

      criado_em: evento.created_at,
      criado_por: evento.user?.mat ? nomeMap.get(evento.user.mat) : undefined,

      homologado_em: evento.homologado_em,
      homologado_por: evento.homologado_por?.mat
        ? nomeMap.get(evento.homologado_por.mat)
        : undefined,

      pd_concluida_em: evento.pd_concluida_em,
      pd_concluida_por: evento.pd_concluida_por?.mat
        ? nomeMap.get(evento.pd_concluida_por.mat)
        : undefined,

      pago_em: evento.pago_em,
      pago_por: evento.pago_por?.mat
        ? nomeMap.get(evento.pago_por.mat)
        : undefined,

      created_at: evento.created_at,
      updated_at: evento.updated_at,
      ome: { id: evento.ome.id, nomeOme: evento.ome.nomeOme },
      teto: {
        id: teto?.id ?? 0,
        nome_verba: teto?.nome_verba ?? '',
        sistema: teto?.sistema ?? '',
      },
      totalCotasOficiais: somaOf,
      totalCotasPracas: somaPrc,
      usuarios: usuariosDto,
    };
  }

  /**
   * Constrói o mapa mat → "pg nomeGuerra" usando os campos snapshot das escalas
   * do próprio evento. Para responsáveis que não tenham escala no evento
   * (ex.: quem homologou mas não está escalado), o nome fica undefined e o
   * caller pode tratar como preferir.
   */
  private async buildNomeMapFromEscala(
    eventoId: number,
    mats: string[],
  ): Promise<Map<string, string>> {
    if (!mats.length) return new Map();

    const rows = await this.escalaRepo
      .createQueryBuilder('e')
      .select('e.mat_escala', 'mat')
      .addSelect('e.pg_escala', 'pg')
      .addSelect('e.ng_escala', 'ng')
      .innerJoin('e.operacao', 'op')
      .innerJoin('op.evento', 'ev')
      .where('ev.id = :eventoId', { eventoId })
      .andWhere('e.mat_escala IN (:...mats)', { mats })
      .distinctOn(['e.mat_escala'])
      .getRawMany();

    return new Map(rows.map((r) => [r.mat, `${r.pg} ${r.ng}`]));
  }

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

  private async findOneEntity(id: number): Promise<Evento> {
    const evento = await this.eventoRepo.findOne({
      where: { id },
      relations: [
        'distribuicao',
        'distribuicao.teto',
        'distribuicao.diretoria',
        'ome',
        'ome.diretoria',
        'user',
        'user.ome',
        'user.ome.diretoria',
      ],
    });

    if (!evento) throw new NotFoundException('Evento não encontrado');
    return evento;
  }

  async alterarStatus(id: number, novoStatus: StatusEvento, user: UserEntity) {
    const evento = await this.findOneEntity(id);
    this.validarPermissaoDiretoria(evento, user);

    const isAdmin = user.typeUser === 9 || user.typeUser === 10;
    const isAux = user.typeUser === 2;
    const isPd = user.typeUser === 6;

    let regras: Partial<Record<StatusEvento, StatusEvento[]>> = {};

    if (isAdmin) {
      regras = {
        [StatusEvento.CRIADO]: [StatusEvento.HOMOLOGADO, StatusEvento.CRIADO],
        [StatusEvento.HOMOLOGADO]: [
          StatusEvento.PD_CONCLUIDA,
          StatusEvento.CRIADO,
        ],
        [StatusEvento.PD_CONCLUIDA]: [
          StatusEvento.PAGO,
          StatusEvento.HOMOLOGADO,
        ],
        [StatusEvento.PAGO]: [StatusEvento.PD_CONCLUIDA],
      };
    }

    if (isAux) {
      regras = {
        [StatusEvento.CRIADO]: [StatusEvento.HOMOLOGADO],
        [StatusEvento.HOMOLOGADO]: [],
        [StatusEvento.PD_CONCLUIDA]: [],
        [StatusEvento.PAGO]: [],
      };
    }

    if (isPd) {
      regras = {
        [StatusEvento.CRIADO]: [],
        [StatusEvento.HOMOLOGADO]: [StatusEvento.PD_CONCLUIDA],
        [StatusEvento.PD_CONCLUIDA]: [StatusEvento.PAGO],
        [StatusEvento.PAGO]: [],
      };
    }

    if (!regras[evento.status_evento]?.includes(novoStatus)) {
      throw new BadRequestException(
        `Não pode mudar de ${evento.status_evento} para ${novoStatus}`,
      );
    }

    evento.status_evento = novoStatus;
    const agora = new Date();

    if (novoStatus === StatusEvento.HOMOLOGADO) {
      evento.homologado_em = agora;
      evento.homologado_por = user;
    }

    if (novoStatus === StatusEvento.CRIADO) {
      evento.homologado_em = null;
      evento.homologado_por = null;
    }

    if (novoStatus === StatusEvento.PD_CONCLUIDA) {
      evento.pd_concluida_em = agora;
      evento.pd_concluida_por = user;
    }

    if (novoStatus === StatusEvento.PAGO) {
      evento.pago_em = agora;
      evento.pago_por = user;
    }

    await this.eventoRepo.save(evento);
    evento.updated_at = agora;
    return new ReturnEventoDto(evento);
  }

  private async getResumoDistribuicao(distribuicaoId: number) {
    const result = await this.distribuicaoRepo
      .createQueryBuilder('dist')
      .select('dist.qtd_dist_of', 'limite_of')
      .addSelect('dist.qtd_dist_prc', 'limite_prc')
      .addSelect('COALESCE(SUM(ev.qtd_of_evento), 0)', 'soma_of_evento')
      .addSelect('COALESCE(SUM(ev.qtd_prc_evento), 0)', 'soma_prc_evento')
      .leftJoin('dist.eventos', 'ev')
      .where('dist.id = :id', { id: distribuicaoId })
      .groupBy('dist.id')
      .getRawOne();

    if (!result) throw new NotFoundException('Distribuição não encontrada');

    return {
      soma_of_evento: Number(result.soma_of_evento),
      soma_prc_evento: Number(result.soma_prc_evento),
      limite_of_distribuicao: Number(result.limite_of),
      limite_prc_distribuicao: Number(result.limite_prc),
    };
  }

  private async getResumoDistribuicaoParaUpdate(
    distribuicaoId: number,
    eventoId: number,
  ) {
    const result = await this.distribuicaoRepo
      .createQueryBuilder('dist')
      .select('dist.qtd_dist_of', 'limite_of')
      .addSelect('dist.qtd_dist_prc', 'limite_prc')
      .addSelect('COALESCE(SUM(ev.qtd_of_evento), 0)', 'soma_of_evento')
      .addSelect('COALESCE(SUM(ev.qtd_prc_evento), 0)', 'soma_prc_evento')
      .leftJoin('dist.eventos', 'ev', 'ev.id != :eventoId', { eventoId })
      .where('dist.id = :id', { id: distribuicaoId })
      .groupBy('dist.id')
      .getRawOne();

    if (!result) throw new NotFoundException('Distribuição não encontrada');

    return {
      soma_of_evento: Number(result.soma_of_evento),
      soma_prc_evento: Number(result.soma_prc_evento),
      limite_of_distribuicao: Number(result.limite_of),
      limite_prc_distribuicao: Number(result.limite_prc),
    };
  }

  private async validarPermissaoDiretoria(
    evento: Evento,
    userToken: UserEntity,
  ) {
    if (
      userToken.typeUser === UserType.MASTER ||
      userToken.typeUser === UserType.TECNICO
    ) {
      return;
    }

    if (userToken.typeUser === UserType.DIRETOR) {
      const user = await this.getUserCompleto(userToken.id);
      const diretoriaEvento = evento.distribuicao.diretoria.id;
      const diretoriaUser = user.ome!.diretoria!.id;

      if (diretoriaEvento !== diretoriaUser) {
        throw new BadRequestException(
          'Você não pode alterar eventos de outra diretoria',
        );
      }
    }
  }

  async create(
    dto: CreateEventoDto,
    user: UserEntity,
  ): Promise<ReturnEventoDto> {
    const distribuicao = await this.distribuicaoRepo.findOne({
      where: { id: dto.distribuicao_id },
      relations: ['diretoria'],
    });

    if (!distribuicao)
      throw new NotFoundException('Distribuição não encontrada');

    if (user.typeUser === UserType.DIRETOR) {
      const userCompleto = await this.getUserCompleto(user.id);
      if (distribuicao.diretoria.id !== userCompleto.ome!.diretoria!.id) {
        throw new BadRequestException(
          'Você não pode criar eventos em distribuições de outra diretoria',
        );
      }
    }

    const ome = await this.omeRepo.findOneBy({ id: dto.ome_id });
    if (!ome) throw new NotFoundException('OME não encontrada');

    const resumo = await this.getResumoDistribuicao(dto.distribuicao_id);

    if (
      resumo.soma_of_evento + dto.qtd_of_evento >
      resumo.limite_of_distribuicao
    ) {
      throw new BadRequestException('OF ultrapassa limite da distribuição');
    }

    if (
      resumo.soma_prc_evento + dto.qtd_prc_evento >
      resumo.limite_prc_distribuicao
    ) {
      throw new BadRequestException('PRC ultrapassa limite da distribuição');
    }

    const evento = this.eventoRepo.create({
      distribuicao,
      ome,
      nome_evento: dto.nome_evento,
      qtd_of_evento: dto.qtd_of_evento,
      qtd_prc_evento: dto.qtd_prc_evento,
      user: user,
    });

    const saved = await this.eventoRepo.save(evento);
    return new ReturnEventoDto(saved);
  }

  // ✅ tipo_escala lido da coluna snapshot — sem join com dadosSgp
  private async getTotalCotasPorTipo(eventoId: number) {
    const result = await this.escalaRepo
      .createQueryBuilder('e')
      .select('e.tipo_escala', 'tipo_escala')
      .addSelect('COALESCE(SUM(e.cota_escala), 0)', 'totalCotas')
      .innerJoin('e.operacao', 'op')
      .innerJoin('op.evento', 'ev')
      .where('ev.id = :eventoId', { eventoId })
      .groupBy('e.tipo_escala')
      .getRawMany();

    return result.map((r) => ({
      tipo_escala: r.tipo_escala,
      totalCotas: Number(r.totalCotas),
    }));
  }

  async findAll(
    distribuicaoId?: number,
  ): Promise<ReturnEventoComTotalCotasDto[]> {
    const qb = this.eventoRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.distribuicao', 'd')
      .leftJoinAndSelect('d.teto', 't')
      .leftJoinAndSelect('e.ome', 'o')
      .leftJoinAndSelect('o.diretoria', 'dir')
      .leftJoinAndSelect('e.user', 'u')
      .leftJoinAndSelect('u.ome', 'uome')
      .leftJoinAndSelect('uome.diretoria', 'udir');

    if (distribuicaoId) {
      qb.where('d.id = :id', { id: distribuicaoId });
    }

    const eventos = await qb.getMany();
    if (!eventos.length) return [];

    const eventoIds = eventos.map((e) => e.id);

    // ✅ tipo_escala lido da coluna snapshot — sem join com dadosSgp
    const todasCotas = await this.escalaRepo
      .createQueryBuilder('esc')
      .select('op.evento_id', 'eventoId')
      .addSelect('esc.tipo_escala', 'tipo_escala')
      .addSelect('COALESCE(SUM(esc.cota_escala), 0)', 'totalCotas')
      .innerJoin('esc.operacao', 'op')
      .where('op.evento_id IN (:...ids)', { ids: eventoIds })
      .groupBy('op.evento_id')
      .addGroupBy('esc.tipo_escala')
      .getRawMany();

    const cotasMap = new Map<number, TotalCotasPorTipo[]>();
    for (const row of todasCotas) {
      const id = Number(row.eventoId);
      if (!cotasMap.has(id)) cotasMap.set(id, []);
      cotasMap.get(id)!.push({
        tipo_escala: row.tipo_escala,
        totalCotas: Number(row.totalCotas),
      });
    }

    return eventos.map(
      (e) => new ReturnEventoComTotalCotasDto(e, cotasMap.get(e.id) ?? []),
    );
  }

  async findOne(id: number): Promise<ReturnEventoDto> {
    const evento = await this.findOneEntity(id);
    return new ReturnEventoDto(evento);
  }

  async update(id: number, dto: UpdateEventoDto, user: UserEntity) {
    const evento = await this.findOneEntity(id);
    this.validarPermissaoDiretoria(evento, user);

    const novoOf = dto.qtd_of_evento ?? evento.qtd_of_evento;
    const novoPrc = dto.qtd_prc_evento ?? evento.qtd_prc_evento;

    const resumo = await this.getResumoDistribuicaoParaUpdate(
      evento.distribuicao.id,
      id,
    );

    if (resumo.soma_of_evento + novoOf > resumo.limite_of_distribuicao) {
      throw new BadRequestException('OF ultrapassa limite da distribuição');
    }

    if (resumo.soma_prc_evento + novoPrc > resumo.limite_prc_distribuicao) {
      throw new BadRequestException('PRC ultrapassa limite da distribuição');
    }

    if (dto.ome_id) {
      const ome = await this.omeRepo.findOneBy({ id: dto.ome_id });
      evento.ome = ome!;
    }

    if (dto.qtd_of_evento !== undefined)
      evento.qtd_of_evento = dto.qtd_of_evento;
    if (dto.qtd_prc_evento !== undefined)
      evento.qtd_prc_evento = dto.qtd_prc_evento;
    if (dto.nome_evento !== undefined) evento.nome_evento = dto.nome_evento;

    await this.eventoRepo.save(evento);
    return this.findOne(id);
  }

  async remove(id: number, user: UserEntity) {
    const evento = await this.findOneEntity(id);
    this.validarPermissaoDiretoria(evento, user);

    const qtdOperacoes = await this.operacaoRepo.count({
      where: { evento: { id } },
    });

    if (qtdOperacoes > 0) {
      throw new BadRequestException(
        `Não é possível excluir o evento pois há ${qtdOperacoes} operação(ões) vinculada(s). Exclua as operações primeiro.`,
      );
    }

    await this.eventoRepo.delete(id);
  }
}
