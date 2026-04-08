// ome.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DiretoriaEntity } from './entities/diretoria.entity';
import { CreateDiretoriaDto } from './dtos/create-diretoria.dto';
import { ReturnDiretoriaDto } from './dtos/return-diretoria.dto';

@Injectable()
export class DiretoriaService {
  constructor(
    @InjectRepository(DiretoriaEntity)
    private readonly diretoriaRepository: Repository<DiretoriaEntity>,
  ) {}

  async create(
    createDiretoriaDto: CreateDiretoriaDto,
  ): Promise<ReturnDiretoriaDto> {
    const diretoria = this.diretoriaRepository.create(createDiretoriaDto);
    const saved = await this.diretoriaRepository.save(diretoria);
    return new ReturnDiretoriaDto(saved);
  }

  async findAll(): Promise<ReturnDiretoriaDto[]> {
    const diretorias = await this.diretoriaRepository.find();
    return diretorias.map((diretoria) => new ReturnDiretoriaDto(diretoria));
  }

  async update(
    id: number,
    data: Partial<CreateDiretoriaDto>,
  ): Promise<ReturnDiretoriaDto> {
    const diretoria = await this.diretoriaRepository.preload({ id, ...data });
    if (!diretoria)
      throw new NotFoundException(`DIRETORIA com ID ${id} não encontrada.`);
    const updated = await this.diretoriaRepository.save(diretoria);
    return new ReturnDiretoriaDto(updated);
  }

  async remove(id: number): Promise<void> {
    const result = await this.diretoriaRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(
        `Diretoria com ID ${id} não encontrada para exclusão.`,
      );
    }
  }
}
