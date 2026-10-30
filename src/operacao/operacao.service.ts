import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { In } from 'typeorm';
import { OperacaoOmeCompartilhada } from './entities/operacao-ome-compartilhada.entity';

import { Operacao } from './entities/operacao.entity';
import { Evento } from 'src/evento/entities/evento.entity';
import { OmeEntity } from 'src/ome/entities/ome.entity';
import { UserEntity } from 'src/user/entities/user.entity'; // ✅

import { CreateOperacaoDto } from './dtos/create-operacao.dto';
import { UpdateOperacaoDto } from './dtos/update-operacao.dto';
import { ReturnOperacaoResumoDto } from './dtos/return-operacao-resumo.dto';
import { UserType } from 'src/user/enum/user-type.enum'; // ✅
import { EscalaEntity } from 'src/escala/entities/escala.entity';
import { ReturnOperacaoComTotalCotasDto } from './dtos/return-operacao-com-total-cotas.dto';

@Injectable()
export class OperacaoService {
  constructor(
    @InjectRepository(Operacao)
    private readonly operacaoRepo: Repository<Operacao>,

    @InjectRepository(EscalaEntity)
    private readonly escalaRepo: Repository<EscalaEntity>,

    @InjectRepository(Evento)
    private readonly eventoRepo: Repository<Evento>,

    @InjectRepository(OmeEntity)
    private readonly omeRepo: Repository<OmeEntity>,

    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,

    @InjectRepository(OperacaoOmeCompartilhada)
    private readonly compRepo: Repository<OperacaoOmeCompartilhada>,
  ) {}

  // ─── Validação das OMEs compartilhadas ──────────────────────────────────────

  private async validarOmesCompartilhadas(
    omeIds: number[],
    omeDonaEventoId: number,
    omeDonaOperacaoId: number,
  ): Promise<number[]> {
    const ids = [...new Set(omeIds)];

    if (ids.some((id) => id === omeDonaEventoId || id === omeDonaOperacaoId)) {
      throw new BadRequestException(
        'A OME dona da operação não pode ser compartilhada consigo mesma',
      );
    }

    if (ids.length) {
      const encontradas = await this.omeRepo.findBy({ id: In(ids) });
      if (encontradas.length !== ids.length) {
        throw new NotFoundException(
          'Alguma OME informada para compartilhamento não foi encontrada',
        );
      }
    }

    return ids;
  }

  // ─── Validação de status ────────────────────────────────────────────────────

  private validarStatusEvento(evento: Evento): void {
    if (evento.status_evento !== 'CRIADO') {
      throw new ForbiddenException(
        `Evento com status "${evento.status_evento}" não permite criação, edição ou exclusão de operações.`,
      );
    }
  }

  // ─── Validação de OME para Auxiliar ────────────────────────────────────────

  private async validarPermissaoOme(
    authUser: { id: number; typeUser: UserType },
    eventoOmeId: number,
  ): Promise<void> {
    const isAuxiliar = Number(authUser.typeUser) === UserType.AUXILIAR;
    if (!isAuxiliar) return; // Tecnico e Master passam direto

    // Carrega o usuário com sua OME
    const user = await this.userRepo.findOne({
      where: { id: authUser.id },
      relations: ['ome'],
    });

    if (!user?.ome) {
      throw new ForbiddenException('Usuário não possui OME vinculada.');
    }

    if (user.ome.id !== eventoOmeId) {
      throw new ForbiddenException(
        'Auxiliar só pode criar/editar/excluir operações de eventos da sua própria OME.',
      );
    }
  }

  // ─── Queries de resumo ──────────────────────────────────────────────────────

  private async getResumoEvento(
    eventoId: number,
  ): Promise<ReturnOperacaoResumoDto> {
    const result = await this.operacaoRepo
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.qtd_oficiais_oper), 0)', 'soma_of_oper')
      .addSelect('COALESCE(SUM(o.qtd_pracas_oper), 0)', 'soma_prc_oper')
      .where('o.evento_id = :id', { id: eventoId })
      .getRawOne();

    const evento = await this.eventoRepo.findOneBy({ id: eventoId });

    return {
      soma_of_oper: Number(result.soma_of_oper),
      soma_prc_oper: Number(result.soma_prc_oper),
      limite_of: Number(evento!.qtd_of_evento),
      limite_prc: Number(evento!.qtd_prc_evento),
    };
  }

  private async getResumoEventoParaUpdate(
    eventoId: number,
    operacaoId: number,
  ): Promise<ReturnOperacaoResumoDto> {
    const result = await this.operacaoRepo
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.qtd_oficiais_oper), 0)', 'soma_of_oper')
      .addSelect('COALESCE(SUM(o.qtd_pracas_oper), 0)', 'soma_prc_oper')
      .where('o.evento_id = :id', { id: eventoId })
      .andWhere('o.id != :operacaoId', { operacaoId })
      .getRawOne();

    const evento = await this.eventoRepo.findOneBy({ id: eventoId });

    return {
      soma_of_oper: Number(result.soma_of_oper),
      soma_prc_oper: Number(result.soma_prc_oper),
      limite_of: Number(evento!.qtd_of_evento),
      limite_prc: Number(evento!.qtd_prc_evento),
    };
  }

  // ─── Geração de cod_op ──────────────────────────────────────────────────────

  private gerarCodOp(): string {
    const agora = new Date();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const ano = String(agora.getFullYear());
    const prefixo = String(Math.floor(1000 + Math.random() * 9000));
    return `${prefixo}${mes}${ano}`;
  }

  private async gerarCodOpUnico(): Promise<string> {
    let cod: string;
    let existe: boolean;

    do {
      cod = this.gerarCodOp();
      existe = !!(await this.operacaoRepo.findOne({ where: { cod_op: cod } }));
    } while (existe);

    return cod;
  }

  // ─── Método complementar ao findAll ──────────────────────────────────────────────────────

  private async enriquecerOperacoes(
    operacoes: Operacao[],
  ): Promise<ReturnOperacaoComTotalCotasDto[]> {
    // Uma única consulta com as OMEs compartilhadas de todas as operações
    const mapaCompartilhadas = new Map<
      number,
      Array<{ id: number; nomeOme: string }>
    >();

    if (operacoes.length) {
      const vinculos = await this.compRepo.find({
        where: { operacao: { id: In(operacoes.map((o) => o.id)) } },
        relations: { operacao: true, ome: true },
      });
      for (const v of vinculos) {
        const lista = mapaCompartilhadas.get(v.operacao.id) ?? [];
        lista.push({ id: v.ome.id, nomeOme: v.ome.nomeOme });
        mapaCompartilhadas.set(v.operacao.id, lista);
      }
    }

    return Promise.all(
      operacoes.map(async (op) => {
        const cotasPorTipo = await this.getTotalCotasPorTipo(op.id);
        return new ReturnOperacaoComTotalCotasDto(
          op,
          cotasPorTipo,
          mapaCompartilhadas.get(op.id) ?? [],
        );
      }),
    );
  }

  // ─── Atualização de cod_op ──────────────────────────────────────────────────────

  async updateCodOp(
    id: number,
    novoCodOp: string,
    authUser: { id: number; typeUser: UserType },
  ): Promise<Operacao> {
    const operacao = await this.findOne(id);

    this.validarStatusEvento(operacao.evento);
    await this.validarPermissaoOme(authUser, operacao.evento.ome.id);

    if (operacao.cod_op === novoCodOp) {
      return operacao;
    }

    const existente = await this.operacaoRepo.findOne({
      where: { cod_op: novoCodOp },
    });

    if (existente) {
      throw new BadRequestException(
        `O código "${novoCodOp}" já está em uso por outra operação.`,
      );
    }

    operacao.cod_op = novoCodOp;
    return this.operacaoRepo.save(operacao);
  }

  // ─── CRUD ───────────────────────────────────────────────────────────────────

  async create(
    dto: CreateOperacaoDto,
    authUser: { id: number; typeUser: UserType },
  ): Promise<Operacao> {
    const evento = await this.eventoRepo.findOne({
      where: { id: dto.evento_id },
      relations: ['ome'],
    });
    if (!evento) throw new NotFoundException('Evento não encontrado');

    this.validarStatusEvento(evento);
    await this.validarPermissaoOme(authUser, evento.ome.id);

    const ome = await this.omeRepo.findOneBy({ id: dto.ome_id });
    if (!ome) throw new NotFoundException('OME não encontrada');

    const omesCompartilhadas = await this.validarOmesCompartilhadas(
      dto.omesCompartilhadas ?? [],
      evento.ome.id,
      dto.ome_id,
    );

    const resumo = await this.getResumoEvento(dto.evento_id);

    if (resumo.soma_of_oper + dto.qtd_oficiais_oper > resumo.limite_of) {
      throw new BadRequestException(
        `Oficiais ultrapassam o limite do evento (limite: ${resumo.limite_of}, em uso: ${resumo.soma_of_oper})`,
      );
    }

    if (resumo.soma_prc_oper + dto.qtd_pracas_oper > resumo.limite_prc) {
      throw new BadRequestException(
        `Praças ultrapassam o limite do evento (limite: ${resumo.limite_prc}, em uso: ${resumo.soma_prc_oper})`,
      );
    }

    const cod_op = await this.gerarCodOpUnico();

    const operacao = this.operacaoRepo.create({
      evento,
      ome,
      nome_operacao: dto.nome_operacao,
      cod_op,
      qtd_oficiais_oper: dto.qtd_oficiais_oper,
      qtd_pracas_oper: dto.qtd_pracas_oper,
    });

    // Operação + vínculos de compartilhamento: tudo ou nada.
    return this.operacaoRepo.manager.transaction(async (manager) => {
      const salva = await manager.save(operacao);

      if (omesCompartilhadas.length) {
        await manager.insert(
          OperacaoOmeCompartilhada,
          omesCompartilhadas.map((omeId) => ({
            operacao: { id: salva.id },
            ome: { id: omeId },
          })),
        );
      }

      return salva;
    });
  }

  // ─── Método auxiliar para buscar totalCotas por tipo_escala ────────────────────
  private async getTotalCotasPorTipo(operacaoId: number) {
    const result = await this.escalaRepo
      .createQueryBuilder('e')
      .select('e.tipo_escala', 'tipo_escala')
      .addSelect('COALESCE(SUM(e.cota_escala), 0)', 'totalCotas')
      .where('e.operacao_id = :operacaoId', { operacaoId })
      .groupBy('e.tipo_escala')
      .getRawMany();

    const tipos = ['O', 'P'];
    return tipos.map((tipo) => {
      const found = result.find((r) => r.tipo_escala === tipo);
      return {
        tipo_escala: tipo,
        totalCotas: found ? Number(found.totalCotas) : 0,
      };
    });
  }

  async findAll(
    eventoId?: number,
    mes?: number,
    ano?: number,
    compartilhadasComigoOmeId?: number,
  ): Promise<ReturnOperacaoComTotalCotasDto[]> {
    const qb = this.operacaoRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.evento', 'e')
      .leftJoinAndSelect('o.ome', 'ome');

    if (eventoId) {
      qb.andWhere('e.id = :id', { id: eventoId });
    }

    // ✅ Só entram operações com alguma escala com data_inicio no mês/ano
    // informados — usado pela modal de filtro.
    if (mes && ano) {
      qb.andWhere(
        `EXISTS (
          SELECT 1
          FROM escala esc
          WHERE esc.operacao_id = o.id
            AND EXTRACT(MONTH FROM esc.data_inicio) = :mes
            AND EXTRACT(YEAR FROM esc.data_inicio) = :ano
        )`,
        { mes, ano },
      );
    }

    // Evento de outra OME: devolve só as operações compartilhadas com a minha
    if (compartilhadasComigoOmeId) {
      qb.andWhere(
        `EXISTS (
          SELECT 1
          FROM operacao_ome_compartilhada oc
          WHERE oc.operacao_id = o.id
            AND oc.ome_id = :omeComp
        )`,
        { omeComp: compartilhadasComigoOmeId },
      );
    }

    const operacoes = await qb.getMany();
    return this.enriquecerOperacoes(operacoes);
  }

  /**
   * Operações que OUTRAS OMEs compartilharam com a OME informada.
   * Traz evento, OME do evento e teto (para montar o link da tela de escala).
   */

  async findCompartilhadasComigo(
    omeId: number,
  ): Promise<ReturnOperacaoComTotalCotasDto[]> {
    const operacoes = await this.operacaoRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.evento', 'e')
      .leftJoinAndSelect('e.ome', 'eome')
      .leftJoinAndSelect('e.distribuicao', 'd')
      .leftJoinAndSelect('d.teto', 't')
      .leftJoinAndSelect('o.ome', 'ome')
      .where(
        `EXISTS (
          SELECT 1
          FROM operacao_ome_compartilhada oc
          WHERE oc.operacao_id = o.id
            AND oc.ome_id = :omeId
        )`,
        { omeId },
      )
      .orderBy('o.created_at', 'DESC')
      .getMany();

    return this.enriquecerOperacoes(operacoes);
  }

  async findOne(id: number): Promise<Operacao> {
    const operacao = await this.operacaoRepo.findOne({
      where: { id },
      relations: ['evento', 'evento.ome', 'ome'], // ✅ inclui ome do evento
    });

    if (!operacao) throw new NotFoundException('Operação não encontrada');
    return operacao;
  }

  async update(
    id: number,
    dto: UpdateOperacaoDto,
    authUser: { id: number; typeUser: UserType },
  ) {
    const operacao = await this.findOne(id);

    const eventoBloqueado = operacao.evento.status_evento !== 'CRIADO';

    // ✅ Quando o evento está bloqueado, só permite editar as cotas
    // (qtd_oficiais_oper / qtd_pracas_oper) — tudo o mais é rejeitado.
    if (eventoBloqueado) {
      const camposNaoPermitidos = (
        ['nome_operacao', 'evento_id', 'ome_id'] as const
      ).filter((campo) => dto[campo] !== undefined);

      if (camposNaoPermitidos.length > 0) {
        throw new ForbiddenException(
          `Evento com status "${operacao.evento.status_evento}" só permite ajustar as cotas (oficiais/praças) da operação.`,
        );
      }
    } else {
      // Fluxo normal: evento em CRIADO permite qualquer edição
      this.validarStatusEvento(operacao.evento);
    }

    // ✅ Auxiliar só pode editar operações de eventos da sua OME (vale nos dois casos)
    await this.validarPermissaoOme(authUser, operacao.evento.ome.id);

    const novoEventoId = dto.evento_id ?? operacao.evento.id;
    const novoOf = dto.qtd_oficiais_oper ?? operacao.qtd_oficiais_oper;
    const novoPrc = dto.qtd_pracas_oper ?? operacao.qtd_pracas_oper;

    // ✅ Validação: novas qtds não podem ser menores que cotas já lançadas
    const cotasPorTipo = await this.getTotalCotasPorTipo(id);
    const cotasOf =
      cotasPorTipo.find((c) => c.tipo_escala === 'O')?.totalCotas ?? 0;
    const cotasPrc =
      cotasPorTipo.find((c) => c.tipo_escala === 'P')?.totalCotas ?? 0;

    if (novoOf < cotasOf) {
      throw new BadRequestException(
        `Qtd. de oficiais (${novoOf}) não pode ser menor que as cotas já escaladas (${cotasOf}).`,
      );
    }
    if (novoPrc < cotasPrc) {
      throw new BadRequestException(
        `Qtd. de praças (${novoPrc}) não pode ser menor que as cotas já escaladas (${cotasPrc}).`,
      );
    }

    let resumo: ReturnOperacaoResumoDto;

    if (
      !eventoBloqueado &&
      dto.evento_id &&
      dto.evento_id !== operacao.evento.id
    ) {
      const novoEvento = await this.eventoRepo.findOne({
        where: { id: dto.evento_id },
        relations: ['ome'],
      });
      if (!novoEvento) throw new NotFoundException('Evento não encontrado');

      this.validarStatusEvento(novoEvento);

      // ✅ Auxiliar também não pode mover para evento de outra OME
      await this.validarPermissaoOme(authUser, novoEvento.ome.id);

      resumo = await this.getResumoEvento(novoEventoId);
      operacao.evento = novoEvento;
    } else {
      resumo = await this.getResumoEventoParaUpdate(novoEventoId, id);
    }

    if (resumo.soma_of_oper + novoOf > resumo.limite_of) {
      throw new BadRequestException(
        `Oficiais ultrapassam o limite do evento (limite: ${resumo.limite_of}, em uso: ${resumo.soma_of_oper})`,
      );
    }

    if (resumo.soma_prc_oper + novoPrc > resumo.limite_prc) {
      throw new BadRequestException(
        `Praças ultrapassam o limite do evento (limite: ${resumo.limite_prc}, em uso: ${resumo.soma_prc_oper})`,
      );
    }

    // ✅ Só permite alterar OME/nome_operacao quando o evento não está bloqueado
    if (!eventoBloqueado && dto.ome_id) {
      const ome = await this.omeRepo.findOneBy({ id: dto.ome_id });
      if (!ome) throw new NotFoundException('OME não encontrada');
      operacao.ome = ome;
    }

    if (!eventoBloqueado && dto.nome_operacao !== undefined) {
      operacao.nome_operacao = dto.nome_operacao;
    }

    operacao.qtd_oficiais_oper = novoOf;
    operacao.qtd_pracas_oper = novoPrc;

    return this.operacaoRepo.save(operacao);
  }

  async remove(id: number, authUser: { id: number; typeUser: UserType }) {
    const operacao = await this.findOne(id);

    this.validarStatusEvento(operacao.evento);
    await this.validarPermissaoOme(authUser, operacao.evento.ome.id);

    // ✅ impede exclusão se houver escalas vinculadas
    const qtdEscalas = await this.escalaRepo.count({
      where: { operacao: { id } },
    });

    if (qtdEscalas > 0) {
      throw new BadRequestException(
        `Não é possível excluir a operação pois há ${qtdEscalas} escala(s) vinculada(s). Exclua as escalas primeiro.`,
      );
    }

    await this.operacaoRepo.delete(id);
  }

  // ─── Compartilhamento ───────────────────────────────────────────────────────

  async getCompartilhamento(id: number) {
    await this.findOne(id);
    const vinculos = await this.compRepo.find({
      where: { operacao: { id } },
      relations: { ome: true },
    });
    return vinculos.map((v) => ({ id: v.ome.id, nomeOme: v.ome.nomeOme }));
  }

  /**
   * Substitui a lista COMPLETA de OMEs compartilhadas.
   * - Só a OME dona (ou MASTER/TECNICO), e só com evento CRIADO.
   * - OMEs removidas: suas VAGAS AINDA ABERTAS são excluídas (liberam cota).
   *   Escalas já PREENCHIDAS permanecem.
   */
  async setCompartilhamento(
    id: number,
    omeIds: number[],
    authUser: { id: number; typeUser: UserType },
  ) {
    const operacao = await this.findOne(id);

    this.validarStatusEvento(operacao.evento);
    await this.validarPermissaoOme(authUser, operacao.evento.ome.id);

    const ids = await this.validarOmesCompartilhadas(
      omeIds,
      operacao.evento.ome.id,
      operacao.ome.id,
    );

    await this.operacaoRepo.manager.transaction(async (manager) => {
      const atuais = await manager.find(OperacaoOmeCompartilhada, {
        where: { operacao: { id } },
        relations: { ome: true },
      });
      const atuaisIds = atuais.map((a) => a.ome.id);

      const removidas = atuaisIds.filter((x) => !ids.includes(x));
      const novas = ids.filter((x) => !atuaisIds.includes(x));

      if (removidas.length) {
        await manager
          .createQueryBuilder()
          .delete()
          .from(EscalaEntity)
          .where('operacao_id = :id', { id })
          .andWhere('is_vaga_aberta = true')
          .andWhere('ome_destino_id IN (:...removidas)', { removidas })
          .execute();

        await manager
          .createQueryBuilder()
          .delete()
          .from(OperacaoOmeCompartilhada)
          .where('operacao_id = :id', { id })
          .andWhere('ome_id IN (:...removidas)', { removidas })
          .execute();
      }

      if (novas.length) {
        await manager.insert(
          OperacaoOmeCompartilhada,
          novas.map((omeId) => ({ operacao: { id }, ome: { id: omeId } })),
        );
      }
    });

    return this.getCompartilhamento(id);
  }
}
