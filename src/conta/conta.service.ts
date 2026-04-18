import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContaEntity } from './entities/conta.entity';
import { CreateContaDto } from './dtos/create-conta.dto';
import { UpdateContaDto } from './dtos/update-conta.dto';

@Injectable()
export class ContaService {
  constructor(
    @InjectRepository(ContaEntity)
    private repo: Repository<ContaEntity>,
  ) {}

  async criar(dto: CreateContaDto) {
    try {
      const conta = this.repo.create(dto);
      return await this.repo.save(conta);
    } catch (error) {
      throw new ConflictException(
        'Usuário já possui conta ou esta conta já está cadastrada para outro usuário.',
      );
    }
  }

  async buscarPorUsuario(usuarioId: number) {
    return this.repo.findOne({ where: { usuarioId } });
  }

  async atualizar(id: number, dto: UpdateContaDto) {
    const conta = await this.repo.findOne({ where: { id } });

    if (!conta) throw new NotFoundException('Conta não encontrada');

    try {
      Object.assign(conta, dto);
      return await this.repo.save(conta);
    } catch {
      throw new ConflictException(
        'Já existe outra conta com esses dados cadastrada.',
      );
    }
  }

  async remover(id: number) {
    await this.repo.delete(id);
  }
}
