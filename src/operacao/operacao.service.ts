import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

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

    @InjectRepository(UserEntity) // ✅
    private readonly userRepo: Repository<UserEntity>,
  ) {}

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

  // ─── CRUD ───────────────────────────────────────────────────────────────────

  async create(
    dto: CreateOperacaoDto,
    authUser: { id: number; typeUser: UserType },
  ): Promise<Operacao> {
    const evento = await this.eventoRepo.findOne({
      where: { id: dto.evento_id },
      relations: ['ome'], // ✅ precisa da OME do evento
    });
    if (!evento) throw new NotFoundException('Evento não encontrado');

    this.validarStatusEvento(evento);

    // ✅ Auxiliar só pode criar em eventos da sua OME
    await this.validarPermissaoOme(authUser, evento.ome.id);

    const ome = await this.omeRepo.findOneBy({ id: dto.ome_id });
    if (!ome) throw new NotFoundException('OME não encontrada');

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

    return this.operacaoRepo.save(operacao);
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

  async findAll(eventoId?: number): Promise<ReturnOperacaoComTotalCotasDto[]> {
    const qb = this.operacaoRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.evento', 'e')
      .leftJoinAndSelect('o.ome', 'ome');

    if (eventoId) {
      qb.where('e.id = :id', { id: eventoId });
    }

    const operacoes = await qb.getMany();

    // Enriquecer cada operação com totalCotas por tipo_escala
    const operacoesComCotas = await Promise.all(
      operacoes.map(async (op) => {
        const cotasPorTipo = await this.getTotalCotasPorTipo(op.id);
        return new ReturnOperacaoComTotalCotasDto(op, cotasPorTipo);
      }),
    );

    return operacoesComCotas;
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

    this.validarStatusEvento(operacao.evento);

    // ✅ Auxiliar só pode editar operações de eventos da sua OME
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

    if (dto.evento_id && dto.evento_id !== operacao.evento.id) {
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

    if (dto.ome_id) {
      const ome = await this.omeRepo.findOneBy({ id: dto.ome_id });
      if (!ome) throw new NotFoundException('OME não encontrada');
      operacao.ome = ome;
    }

    if (dto.nome_operacao !== undefined) {
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
}
