import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { Teto } from './entities/teto.entity';

@Injectable()
export class TetoService {
  constructor(
    @InjectRepository(Teto)
    private readonly tetoRepository: Repository<Teto>,
  ) {}

  create(teto: Partial<Teto>): Promise<Teto> {
    const novoTeto = this.tetoRepository.create(teto);
    return this.tetoRepository.save(novoTeto);
  }

  findAll(): Promise<Teto[]> {
    return this.tetoRepository.find();
  }

  async findOne(id: number): Promise<Teto> {
    const teto = await this.tetoRepository.findOneBy({ id });
    if (!teto) {
      throw new NotFoundException(`Teto com ID ${id} não encontrado`);
    }
    return teto;
  }

  async update(id: number, dados: Partial<Teto>): Promise<Teto> {
    await this.tetoRepository.update(id, dados);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.tetoRepository.delete(id);
  }
}
