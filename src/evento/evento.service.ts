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
// ─── Novos imports ───────────────────────────────────────────────────────────
import { EscalaEntity } from 'src/escala/entities/escala.entity';
import {
  ReturnEventoComEscalasDto,
  UsuarioResumoEscalaDto,
} from './dtos/return-evento-com-escalas.dto';

@Injectable()
export class EventoService {
  constructor(
    @InjectRepository(Evento)
    private readonly eventoRepo: Repository<Evento>,

    @InjectRepository(Distribuicao)
    private readonly distribuicaoRepo: Repository<Distribuicao>,

    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,

    @InjectRepository(OmeEntity)
    private readonly omeRepo: Repository<OmeEntity>,

    // ─── Novo InjectRepository no construtor ────────────────────────────────────
    @InjectRepository(EscalaEntity)
    private readonly escalaRepo: Repository<EscalaEntity>,
  ) {}

  // ─── Método getResumoEscalas ─────────────────────────────────────────────────
  async getResumoEscalas(eventoId: number): Promise<ReturnEventoComEscalasDto> {
    // ✅ Busca o evento completo
    const evento = await this.eventoRepo.findOne({
      where: { id: eventoId },
      relations: ['ome', 'user', 'user.ome'],
    });
    if (!evento) throw new NotFoundException('Evento não encontrado');

    // ✅ Query performática: une escala → operacao → evento, agrupa por usuario_id
    // Todos os dados do usuário vêm dos campos desnormalizados da escala
    const rows = await this.escalaRepo
      .createQueryBuilder('e')
      .select('e.usuario_id', 'usuarioId')
      .addSelect('e.mat', 'mat')
      .addSelect('e.pg_escala', 'pg')
      .addSelect('e.nome_escala', 'nomeGuerra')
      .addSelect('e.nomeome_escala', 'nomeOme')
      .addSelect('e.phone_escala', 'phone')
      .addSelect('e.cpf_escala', 'cpf')
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
      .addGroupBy('e.phone_escala')
      .addGroupBy('e.cpf_escala')
      .addGroupBy('e.banco_escala')
      .addGroupBy('e.agencia_escala')
      .addGroupBy('e.conta_escala')
      .orderBy('e.nomeome_escala', 'ASC')
      .addOrderBy('e.pg_escala', 'ASC')
      .addOrderBy('e.nome_escala', 'ASC')
      .getRawMany();

    // ✅ Busca nunfunc e nunvinc do UserEntity — únicos campos não desnormalizados
    const usuarioIds: number[] = [
      ...new Set(rows.map((r) => Number(r.usuarioId))),
    ];

    const usuarios = await this.userRepo.find({
      where: usuarioIds.map((id) => ({ id })),
      select: ['id', 'nunfunc', 'nunvinc'],
    });

    const nunfuncMap = new Map(
      usuarios.map((u) => [u.id, { nunfunc: u.nunfunc, nunvinc: u.nunvinc }]),
    );

    // ✅ Totalizadores separados por tipo
    const totalCotasOficiais = rows
      .filter((r) => r.pg !== 'O') // filtra por pg_escala se quiser, ou use tipo_escala
      .reduce((sum, r) => sum + Number(r.totalCotas), 0);

    // Melhor usar tipo_escala — adicione ao select e groupBy
    const rowsComTipo = await this.escalaRepo
      .createQueryBuilder('e')
      .select('e.tipo_escala', 'tipo')
      .addSelect('COALESCE(SUM(e.cota_escala), 0)', 'soma')
      .innerJoin('e.operacao', 'op')
      .innerJoin('op.evento', 'ev')
      .where('ev.id = :eventoId', { eventoId })
      .groupBy('e.tipo_escala')
      .getRawMany();

    const somaOf = Number(rowsComTipo.find((r) => r.tipo === 'O')?.soma ?? 0);
    const somaPrc = Number(rowsComTipo.find((r) => r.tipo === 'P')?.soma ?? 0);

    const usuariosDto: UsuarioResumoEscalaDto[] = rows.map((r) => ({
      usuarioId: Number(r.usuarioId),
      mat: Number(r.mat),
      pg: r.pg,
      nomeGuerra: r.nomeGuerra,
      nomeOme: r.nomeOme,
      phone: r.phone ?? '-',
      cpf: r.cpf,
      nunfunc: nunfuncMap.get(Number(r.usuarioId))?.nunfunc ?? '-',
      nunvinc: nunfuncMap.get(Number(r.usuarioId))?.nunvinc ?? '-',
      banco: r.banco,
      agencia: r.agencia,
      conta: r.conta,
      totalCotas: Number(r.totalCotas),
    }));

    return {
      id: evento.id,
      nome_evento: evento.nome_evento,
      qtd_of_evento: evento.qtd_of_evento,
      qtd_prc_evento: evento.qtd_prc_evento,
      status_evento: evento.status_evento,
      homologado_em: evento.homologado_em,
      pd_concluida_em: evento.pd_concluida_em,
      pago_em: evento.pago_em,
      created_at: evento.created_at,
      updated_at: evento.updated_at,
      ome: { id: evento.ome.id, nomeOme: evento.ome.nomeOme },
      totalCotasOficiais: somaOf,
      totalCotasPracas: somaPrc,
      usuarios: usuariosDto,
    };
  }

  // Metodo que busca o usuario completo com suas relações
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

    /**
     *    Admin  -> pode avançar e VOLTAR status (des-homologar, etc)
     *    Aux    -> só pode HOMOLOGAR
     *    PD     -> só pode concluir PD e Pagar
     */
    const isAdmin = user.typeUser === 9 || user.typeUser === 10;
    const isAux = user.typeUser === 2;
    const isPd = user.typeUser === 6;

    let regras: Partial<Record<StatusEvento, StatusEvento[]>> = {};

    if (isAdmin) {
      regras = {
        [StatusEvento.CRIADO]: [
          StatusEvento.HOMOLOGADO,
          StatusEvento.CRIADO, // permite "não fazer nada"
        ],

        [StatusEvento.HOMOLOGADO]: [
          StatusEvento.PD_CONCLUIDA,
          StatusEvento.CRIADO, // des-homologar
        ],

        [StatusEvento.PD_CONCLUIDA]: [
          StatusEvento.PAGO,
          StatusEvento.HOMOLOGADO, // voltar para homologado
        ],

        [StatusEvento.PAGO]: [
          StatusEvento.PD_CONCLUIDA, // desfazer pagamento
        ],
      };
    }

    /*Auxiliar só pode: CRIADO -> HOMOLOGADO*/
    if (isAux) {
      regras = {
        [StatusEvento.CRIADO]: [StatusEvento.HOMOLOGADO],
        [StatusEvento.HOMOLOGADO]: [],
        [StatusEvento.PD_CONCLUIDA]: [],
        [StatusEvento.PAGO]: [],
      };
    }

    /*REGRAS DO PD: não pode homologar*/
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
    }

    if (novoStatus === StatusEvento.PD_CONCLUIDA) {
      evento.pd_concluida_em = agora;
    }

    if (novoStatus === StatusEvento.PAGO) {
      evento.pago_em = agora;
    }

    evento.user = user;
    await this.eventoRepo.save(evento);
    evento.updated_at = agora;
    return new ReturnEventoDto(evento);
  }

  private async getResumoDistribuicao(distribuicaoId: number) {
    const result = await this.eventoRepo
      .createQueryBuilder('e')
      .select('COALESCE(SUM(e.qtd_of_evento), 0)', 'soma_of_evento')
      .addSelect('COALESCE(SUM(e.qtd_prc_evento), 0)', 'soma_prc_evento')
      .where('e.distribuicao.id = :id', { id: distribuicaoId })
      .getRawOne();

    const dist = await this.distribuicaoRepo.findOneBy({ id: distribuicaoId });

    return {
      soma_of_evento: Number(result.soma_of_evento),
      soma_prc_evento: Number(result.soma_prc_evento),
      limite_of_distribuicao: Number(dist!.qtd_dist_of),
      limite_prc_distribuicao: Number(dist!.qtd_dist_prc),
    };
  }

  private async getResumoDistribuicaoParaUpdate(
    distribuicaoId: number,
    eventoId: number,
  ) {
    const result = await this.eventoRepo
      .createQueryBuilder('e')
      .select('COALESCE(SUM(e.qtd_of_evento), 0)', 'soma_of_evento')
      .addSelect('COALESCE(SUM(e.qtd_prc_evento), 0)', 'soma_prc_evento')
      .where('e.distribuicao.id = :id', { id: distribuicaoId })
      .andWhere('e.id != :eventoId', { eventoId })
      .getRawOne();

    const dist = await this.distribuicaoRepo.findOneBy({ id: distribuicaoId });

    return {
      soma_of_evento: Number(result.soma_of_evento),
      soma_prc_evento: Number(result.soma_prc_evento),
      limite_of_distribuicao: Number(dist!.qtd_dist_of),
      limite_prc_distribuicao: Number(dist!.qtd_dist_prc),
    };
  }

  private async validarPermissaoDiretoria(
    evento: Evento,
    userToken: UserEntity,
  ) {
    // MASTER e TECNICO podem tudo
    if (
      userToken.typeUser === UserType.MASTER ||
      userToken.typeUser === UserType.TECNICO
    ) {
      return;
    }

    // Só diretor precisa validar
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

  async findAll(distribuicaoId?: number): Promise<ReturnEventoDto[]> {
    const qb = this.eventoRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.distribuicao', 'd')
      .leftJoinAndSelect('e.ome', 'o')
      .leftJoinAndSelect('o.diretoria', 'dir')

      // 👇 FALTAVA ISSO
      .leftJoinAndSelect('e.user', 'u')
      .leftJoinAndSelect('u.ome', 'uome')
      .leftJoinAndSelect('uome.diretoria', 'udir');

    if (distribuicaoId) {
      qb.where('d.id = :id', { id: distribuicaoId });
    }

    const eventos = await qb.getMany();
    return eventos.map((e) => new ReturnEventoDto(e));
  }

  async findOne(id: number): Promise<ReturnEventoDto> {
    const evento = await this.findOneEntity(id);
    return new ReturnEventoDto(evento);
  }

  async update(id: number, dto: UpdateEventoDto, user: UserEntity) {
    const evento = await this.findOneEntity(id);
    this.validarPermissaoDiretoria(evento, user);

    // 1) Descobrir quais serão os NOVOS valores (sem alterar o objeto ainda)
    const novoOf = dto.qtd_of_evento ?? evento.qtd_of_evento;
    const novoPrc = dto.qtd_prc_evento ?? evento.qtd_prc_evento;

    // 2) Buscar o resumo da distribuição DESCONSIDERANDO esse evento
    const resumo = await this.getResumoDistribuicaoParaUpdate(
      evento.distribuicao.id,
      id,
    );

    // 3) Validar com base nos novos valores
    if (resumo.soma_of_evento + novoOf > resumo.limite_of_distribuicao) {
      throw new BadRequestException('OF ultrapassa limite da distribuição');
    }

    if (resumo.soma_prc_evento + novoPrc > resumo.limite_prc_distribuicao) {
      throw new BadRequestException('PRC ultrapassa limite da distribuição');
    }

    // 4) Só agora aplicar as alterações no objeto
    if (dto.ome_id) {
      const ome = await this.omeRepo.findOneBy({ id: dto.ome_id });
      evento.ome = ome!;
    }

    if (dto.qtd_of_evento !== undefined) {
      evento.qtd_of_evento = dto.qtd_of_evento;
    }

    if (dto.qtd_prc_evento !== undefined) {
      evento.qtd_prc_evento = dto.qtd_prc_evento;
    }

    if (dto.nome_evento !== undefined) {
      evento.nome_evento = dto.nome_evento;
    }

    await this.eventoRepo.save(evento);
    return this.findOne(id);
  }

  async remove(id: number, user: UserEntity) {
    const evento = await this.findOneEntity(id);

    // 🔥 REGRA AQUI
    this.validarPermissaoDiretoria(evento, user);

    await this.eventoRepo.delete(id);
  }
}
