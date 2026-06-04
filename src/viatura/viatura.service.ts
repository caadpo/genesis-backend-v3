import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ViaturaEntity } from './entities/viatura.entity';
import { CreateViaturaDto } from './dtos/create-viatura.dto';
import { UpdateViaturaDto } from './dtos/update-viatura.dto';
import { ReturnViaturaDto } from './dtos/return-viatura.dto';
import { UserType } from 'src/user/enum/user-type.enum';

@Injectable()
export class ViaturaService {
  constructor(
    @InjectRepository(ViaturaEntity)
    private readonly repo: Repository<ViaturaEntity>,
  ) {}

  private checarOme(
    viaturaOmeId: number,
    usuarioLogado: { typeUser: number; omeId: number },
  ): void {
    if (
      Number(usuarioLogado.typeUser) === UserType.AUXILIAR &&
      viaturaOmeId !== usuarioLogado.omeId
    ) {
      throw new ForbiddenException('Você só pode acessar viaturas da sua OME');
    }
  }

  async findByOperacao(operacaoId: number): Promise<ReturnViaturaDto[]> {
    const viaturas = await this.repo
      .createQueryBuilder('v')
      .innerJoin('operacao', 'op', 'op.id = :operacaoId', { operacaoId })
      .innerJoin('evento', 'ev', 'ev.id = op.evento_id')
      .where('v.omeid = ev.ome_id')
      .orderBy('v.patrimonio', 'ASC')
      .getMany();

    return viaturas.map((v) => new ReturnViaturaDto(v));
  }

  async create(
    dto: CreateViaturaDto,
    usuarioLogado: { typeUser: number; omeId: number },
  ): Promise<ReturnViaturaDto> {
    // A viatura sempre é criada na OME do usuário logado
    const viatura = this.repo.create({
      patrimonio: dto.patrimonio,
      kmAtual: dto.kmAtual ?? 0,
      statusVtr: dto.statusVtr,
      anotacao: dto.anotacao,
      omeId: usuarioLogado.omeId,
    });

    const saved = await this.repo.save(viatura);
    return new ReturnViaturaDto(saved);
  }

  // Lista apenas as viaturas da OME do usuário logado
  async findByOme(usuarioLogado: {
    typeUser: number;
    omeId: number;
  }): Promise<ReturnViaturaDto[]> {
    const viaturas = await this.repo.find({
      where: { omeId: usuarioLogado.omeId },
      order: { patrimonio: 'ASC' },
    });

    return viaturas.map((v) => new ReturnViaturaDto(v));
  }

  async findOne(
    id: number,
    usuarioLogado: { typeUser: number; omeId: number },
  ): Promise<ReturnViaturaDto> {
    const viatura = await this.repo.findOne({ where: { id } });
    if (!viatura) throw new NotFoundException('Viatura não encontrada');

    this.checarOme(viatura.omeId, usuarioLogado);
    return new ReturnViaturaDto(viatura);
  }

  async update(
    id: number,
    dto: UpdateViaturaDto,
    usuarioLogado: { typeUser: number; omeId: number },
  ): Promise<ReturnViaturaDto> {
    const viatura = await this.repo.findOne({ where: { id } });
    if (!viatura) throw new NotFoundException('Viatura não encontrada');

    this.checarOme(viatura.omeId, usuarioLogado);

    Object.assign(viatura, {
      ...(dto.patrimonio && { patrimonio: dto.patrimonio }),
      ...(dto.kmAtual !== undefined && { kmAtual: dto.kmAtual }),
      ...(dto.statusVtr && { statusVtr: dto.statusVtr }),
      ...(dto.anotacao !== undefined && { anotacao: dto.anotacao }),
    });

    await this.repo.save(viatura);
    return new ReturnViaturaDto(viatura);
  }

  async remove(
    id: number,
    usuarioLogado: { typeUser: number; omeId: number },
  ): Promise<void> {
    const viatura = await this.repo.findOne({ where: { id } });
    if (!viatura) throw new NotFoundException('Viatura não encontrada');

    this.checarOme(viatura.omeId, usuarioLogado);
    await this.repo.delete(id);
  }
}
