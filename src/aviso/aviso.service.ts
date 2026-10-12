import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Aviso } from './entities/aviso.entity';
import { CreateAvisoDto } from './dtos/create-aviso.dto';
import { UpdateAvisoDto } from './dtos/update-aviso.dto';
import { ReturnAvisoDto } from './dtos/return-aviso.dto';

@Injectable()
export class AvisosService {
  constructor(
    @InjectRepository(Aviso)
    private readonly avisoRepository: Repository<Aviso>,
  ) {}

  private toReturn(a: Aviso): ReturnAvisoDto {
    return {
      id: a.id,
      nome: a.nome,
      descricao: a.descricao ?? null,
      imagemUrl: a.imagemUrl ?? null,
      dataHora: a.dataHora,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    };
  }

  async findAll(limit?: number): Promise<ReturnAvisoDto[]> {
    const avisos = await this.avisoRepository.find({
      order: { dataHora: 'DESC', id: 'DESC' },
      ...(limit && limit > 0 ? { take: limit } : {}),
    });
    return avisos.map((a) => this.toReturn(a));
  }

  async count(): Promise<number> {
    return this.avisoRepository.count();
  }

  async findOne(id: number): Promise<ReturnAvisoDto> {
    const aviso = await this.avisoRepository.findOne({ where: { id } });
    if (!aviso) throw new NotFoundException(`Aviso ${id} não encontrado`);
    return this.toReturn(aviso);
  }

  async create(dto: CreateAvisoDto): Promise<ReturnAvisoDto> {
    const aviso = this.avisoRepository.create({
      nome: dto.nome,
      descricao: dto.descricao || null,
      imagemUrl: dto.imagemUrl || null,
      dataHora: new Date(dto.dataHora),
    });
    const saved = await this.avisoRepository.save(aviso);
    return this.toReturn(saved);
  }

  async update(id: number, dto: UpdateAvisoDto): Promise<ReturnAvisoDto> {
    const aviso = await this.avisoRepository.findOne({ where: { id } });
    if (!aviso) throw new NotFoundException(`Aviso ${id} não encontrado`);

    if (dto.nome !== undefined) aviso.nome = dto.nome;
    if (dto.descricao !== undefined) aviso.descricao = dto.descricao || null;
    if (dto.imagemUrl !== undefined) aviso.imagemUrl = dto.imagemUrl || null;
    if (dto.dataHora !== undefined) aviso.dataHora = new Date(dto.dataHora);

    const saved = await this.avisoRepository.save(aviso);
    return this.toReturn(saved);
  }

  async remove(id: number): Promise<void> {
    const result = await this.avisoRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`Aviso ${id} não encontrado`);
    }
  }
}
