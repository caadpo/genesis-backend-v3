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

@Injectable()
export class EventoService {
  constructor(
    @InjectRepository(Evento)
    private readonly eventoRepo: Repository<Evento>,

    @InjectRepository(Distribuicao)
    private readonly distribuicaoRepo: Repository<Distribuicao>,

    @InjectRepository(OmeEntity)
    private readonly omeRepo: Repository<OmeEntity>,
  ) {}

  // 🔥 RESUMO PERFORMÁTICO
  private async getResumoDistribuicao(distribuicaoId: number) {
    const result = await this.eventoRepo
      .createQueryBuilder('e')
      .select('COALESCE(SUM(e.qtd_oficiais), 0)', 'soma_of')
      .addSelect('COALESCE(SUM(e.qtd_pracas), 0)', 'soma_prc')
      .where('e.distribuicao_id = :id', { id: distribuicaoId })
      .getRawOne();

    const dist = await this.distribuicaoRepo.findOneBy({
      id: distribuicaoId,
    });

    return {
      soma_of: Number(result.soma_of),
      soma_prc: Number(result.soma_prc),
      limite_of: Number(dist!.qtd_dist_of),
      limite_prc: Number(dist!.qtd_dist_prc),
    };
  }

  private async getResumoDistribuicaoParaUpdate(
    distribuicaoId: number,
    eventoId: number,
  ) {
    const result = await this.eventoRepo
      .createQueryBuilder('e')
      .select('COALESCE(SUM(e.qtd_oficiais), 0)', 'soma_of')
      .addSelect('COALESCE(SUM(e.qtd_pracas), 0)', 'soma_prc')
      .where('e.distribuicao_id = :id', { id: distribuicaoId })
      .andWhere('e.id != :eventoId', { eventoId })
      .getRawOne();

    const dist = await this.distribuicaoRepo.findOneBy({
      id: distribuicaoId,
    });

    return {
      soma_of: Number(result.soma_of),
      soma_prc: Number(result.soma_prc),
      limite_of: Number(dist!.qtd_dist_of),
      limite_prc: Number(dist!.qtd_dist_prc),
    };
  }

  async create(dto: CreateEventoDto): Promise<Evento> {
    const distribuicao = await this.distribuicaoRepo.findOneBy({
      id: dto.distribuicao_id,
    });
    if (!distribuicao)
      throw new NotFoundException('Distribuição não encontrada');

    const ome = await this.omeRepo.findOneBy({ id: dto.ome_id });
    if (!ome) throw new NotFoundException('OME não encontrada');

    const resumo = await this.getResumoDistribuicao(dto.distribuicao_id);

    if (resumo.soma_of + dto.qtd_oficiais > resumo.limite_of) {
      throw new BadRequestException('OF ultrapassa limite da distribuição');
    }

    if (resumo.soma_prc + dto.qtd_pracas > resumo.limite_prc) {
      throw new BadRequestException('PRC ultrapassa limite da distribuição');
    }

    const evento = this.eventoRepo.create({
      distribuicao,
      ome,
      nome: dto.nome,
      qtd_oficiais: dto.qtd_oficiais,
      qtd_pracas: dto.qtd_pracas,
      valor_total: dto.valor_total,
    });

    return this.eventoRepo.save(evento);
  }

  findAll(): Promise<Evento[]> {
    return this.eventoRepo.find({
      relations: ['distribuicao', 'ome'],
    });
  }

  async findOne(id: number): Promise<Evento> {
    const evento = await this.eventoRepo.findOne({
      where: { id },
      relations: ['distribuicao', 'ome'],
    });

    if (!evento) throw new NotFoundException('Evento não encontrado');
    return evento;
  }

  async update(id: number, dto: UpdateEventoDto) {
    const evento = await this.findOne(id);

    if (dto.ome_id) {
      const ome = await this.omeRepo.findOneBy({ id: dto.ome_id });
      evento.ome = ome!;
    }

    if (dto.qtd_oficiais !== undefined) {
      evento.qtd_oficiais = dto.qtd_oficiais;
    }

    if (dto.qtd_pracas !== undefined) {
      evento.qtd_pracas = dto.qtd_pracas;
    }

    if (dto.nome !== undefined) {
      evento.nome = dto.nome;
    }

    if (dto.valor_total !== undefined) {
      evento.valor_total = dto.valor_total;
    }

    const resumo = await this.getResumoDistribuicaoParaUpdate(
      evento.distribuicao.id,
      id,
    );

    const novoOf = dto.qtd_oficiais ?? evento.qtd_oficiais;
    const novoPrc = dto.qtd_pracas ?? evento.qtd_pracas;

    if (resumo.soma_of + novoOf > resumo.limite_of) {
      throw new BadRequestException('OF ultrapassa limite da distribuição');
    }

    if (resumo.soma_prc + novoPrc > resumo.limite_prc) {
      throw new BadRequestException('PRC ultrapassa limite da distribuição');
    }

    return this.eventoRepo.save(evento);
  }

  async remove(id: number) {
    await this.eventoRepo.delete(id);
  }
}
