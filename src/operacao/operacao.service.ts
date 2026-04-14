import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Operacao } from './entities/operacao.entity';
import { Evento } from 'src/evento/entities/evento.entity';
import { OmeEntity } from 'src/ome/entities/ome.entity';

import { CreateOperacaoDto } from './dtos/create-operacao.dto';
import { UpdateOperacaoDto } from './dtos/update-operacao.dto';
import { ReturnOperacaoResumoDto } from './dtos/return-operacao-resumo.dto';

@Injectable()
export class OperacaoService {
  constructor(
    @InjectRepository(Operacao)
    private readonly operacaoRepo: Repository<Operacao>,

    @InjectRepository(Evento)
    private readonly eventoRepo: Repository<Evento>,

    @InjectRepository(OmeEntity)
    private readonly omeRepo: Repository<OmeEntity>,
  ) {}

  // 🔥 QUERY PERFORMÁTICA
  private async getResumoEvento(
    eventoId: number,
  ): Promise<ReturnOperacaoResumoDto> {
    const result = await this.operacaoRepo
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.qtd_oficiais_oper), 0)', 'soma_of')
      .addSelect('COALESCE(SUM(o.qtd_pracas_oper), 0)', 'soma_prc')
      .where('o.evento_id = :id', { id: eventoId })
      .getRawOne();

    const evento = await this.eventoRepo.findOneBy({ id: eventoId });

    return {
      soma_of: Number(result.soma_of),
      soma_prc: Number(result.soma_prc),
      limite_of: Number(evento!.qtd_oficiais),
      limite_prc: Number(evento!.qtd_pracas),
    };
  }

  private async getResumoEventoParaUpdate(
    eventoId: number,
    operacaoId: number,
  ): Promise<ReturnOperacaoResumoDto> {
    const result = await this.operacaoRepo
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.qtd_oficiais_oper), 0)', 'soma_of')
      .addSelect('COALESCE(SUM(o.qtd_pracas_oper), 0)', 'soma_prc')
      .where('o.evento_id = :id', { id: eventoId })
      .andWhere('o.id != :operacaoId', { operacaoId })
      .getRawOne();

    const evento = await this.eventoRepo.findOneBy({ id: eventoId });

    return {
      soma_of: Number(result.soma_of),
      soma_prc: Number(result.soma_prc),
      limite_of: Number(evento!.qtd_oficiais),
      limite_prc: Number(evento!.qtd_pracas),
    };
  }

  async create(dto: CreateOperacaoDto): Promise<Operacao> {
    const evento = await this.eventoRepo.findOneBy({
      id: dto.evento_id,
    });
    if (!evento) throw new NotFoundException('Evento não encontrado');

    const ome = await this.omeRepo.findOneBy({ id: dto.ome_id });
    if (!ome) throw new NotFoundException('OME não encontrada');

    const resumo = await this.getResumoEvento(dto.evento_id);

    if (resumo.soma_of + dto.qtd_oficiais_oper > resumo.limite_of) {
      throw new BadRequestException('OF ultrapassa limite do evento');
    }

    if (resumo.soma_prc + dto.qtd_pracas_oper > resumo.limite_prc) {
      throw new BadRequestException('PRC ultrapassa limite do evento');
    }

    const operacao = this.operacaoRepo.create({
      evento,
      ome,
      nome_operacao: dto.nome_operacao,
      cod_verba: dto.cod_verba,
      cod_op: dto.cod_op,
      qtd_oficiais_oper: dto.qtd_oficiais_oper,
      qtd_pracas_oper: dto.qtd_pracas_oper,
      user_id: dto.user_id,
    });

    return this.operacaoRepo.save(operacao);
  }

  findAll(): Promise<Operacao[]> {
    return this.operacaoRepo.find({
      relations: ['evento', 'ome'],
    });
  }

  async findOne(id: number): Promise<Operacao> {
    const operacao = await this.operacaoRepo.findOne({
      where: { id },
      relations: ['evento', 'ome'],
    });

    if (!operacao) throw new NotFoundException('Operação não encontrada');
    return operacao;
  }

  async update(id: number, dto: UpdateOperacaoDto) {
    const operacao = await this.findOne(id);

    // NÃO ALTERA A ENTIDADE AINDA

    const eventoId = dto.evento_id ?? operacao.evento.id;

    const resumo = await this.getResumoEventoParaUpdate(eventoId, id);

    const novoOf = dto.qtd_oficiais_oper ?? operacao.qtd_oficiais_oper;

    const novoPrc = dto.qtd_pracas_oper ?? operacao.qtd_pracas_oper;

    if (resumo.soma_of + novoOf > resumo.limite_of) {
      throw new BadRequestException('OF ultrapassa limite do evento');
    }

    if (resumo.soma_prc + novoPrc > resumo.limite_prc) {
      throw new BadRequestException('PRC ultrapassa limite do evento');
    }

    // AGORA SIM altera a entidade

    if (dto.evento_id) {
      const evento = await this.eventoRepo.findOneBy({ id: eventoId });
      if (!evento) throw new NotFoundException('Evento não encontrado');
      operacao.evento = evento;
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

  async remove(id: number) {
    await this.operacaoRepo.delete(id);
  }
}
