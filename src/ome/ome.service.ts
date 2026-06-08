// ome.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OmeEntity } from './entities/ome.entity';
import { ReturnOmeDto } from './dtos/return-ome.dto';
import { CreateOmeDto } from './dtos/create-ome.dto';

@Injectable()
export class OmeService {
  constructor(
    @InjectRepository(OmeEntity)
    private readonly omeRepository: Repository<OmeEntity>,
  ) {}

  async create(createOmeDto: CreateOmeDto): Promise<ReturnOmeDto> {
    const ome = this.omeRepository.create(createOmeDto);
    const saved = await this.omeRepository.save(ome);
    return new ReturnOmeDto(saved);
  }

  async findAll(diretoriaId?: number): Promise<ReturnOmeDto[]> {
    const qb = this.omeRepository
      .createQueryBuilder('ome')
      .leftJoinAndSelect('ome.diretoria', 'diretoria')
      .orderBy('ome.nomeOme', 'ASC');

    if (diretoriaId) {
      qb.where('diretoria.id = :diretoriaId', { diretoriaId });
    }

    const omes = await qb.getMany();
    return omes.map((ome) => new ReturnOmeDto(ome));
  }

  async getDiretoriaIdByOme(omeId: number): Promise<number | undefined> {
    const ome = await this.omeRepository.findOne({
      where: { id: omeId },
      relations: ['diretoria'],
    });
    return ome?.diretoria?.id;
  }

  async findOne(id: number): Promise<ReturnOmeDto> {
    const ome = await this.omeRepository.findOne({
      where: { id },
      relations: ['diretoria'],
    });

    if (!ome) throw new NotFoundException(`OME com ID ${id} não encontrada.`);
    return new ReturnOmeDto(ome);
  }

  async update(id: number, data: Partial<CreateOmeDto>): Promise<ReturnOmeDto> {
    const ome = await this.omeRepository.preload({ id, ...data });
    if (!ome) throw new NotFoundException(`OME com ID ${id} não encontrada.`);
    const updated = await this.omeRepository.save(ome);
    return this.findOne(updated.id);
  }

  async remove(id: number): Promise<void> {
    const result = await this.omeRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(
        `OME com ID ${id} não encontrada para exclusão.`,
      );
    }
  }
}
