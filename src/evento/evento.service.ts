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
  ) {}

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
