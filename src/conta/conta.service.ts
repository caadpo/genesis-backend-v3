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
import { ReturnContaDto } from './dtos/return-conta.dto';

@Injectable()
export class ContaService {
  constructor(
    @InjectRepository(ContaEntity)
    private repo: Repository<ContaEntity>,
  ) {}

  async criar(dto: CreateContaDto, userId: number) {
    try {
      const conta = this.repo.create({
        ...dto,
        createdByUserId: userId,
        updatedByUserId: userId,
      });

      return await this.repo.save(conta);
    } catch (error) {
      throw new ConflictException(
        'Usuário já possui conta ou esta conta já está cadastrada para outro usuário.',
      );
    }
  }

  async buscarPorUsuario(usuarioId: number) {
    const conta = await this.repo.findOne({
      where: { usuarioId },
      relations: {
        createdByUser: true,
        updatedByUser: true,
        usuario: true,
      },
    });

    if (!conta) return null;

    return {
      id: conta.id,
      banco: conta.banco,
      agencia: conta.agencia,
      conta: conta.conta,
      createdAt: conta.createdAt,
      updatedAt: conta.updatedAt,

      createdBy: conta.createdByUser
        ? {
            id: conta.createdByUser.id,
            loginSei: conta.createdByUser.loginSei,
          }
        : null,

      updatedBy: conta.updatedByUser
        ? {
            id: conta.updatedByUser.id,
            loginSei: conta.updatedByUser.loginSei,
          }
        : null,
    } as ReturnContaDto;
  }

  async atualizar(id: number, dto: UpdateContaDto, userId: number) {
    const conta = await this.repo.findOne({ where: { id } });

    if (!conta) throw new NotFoundException('Conta não encontrada');

    try {
      Object.assign(conta, dto);
      conta.updatedByUserId = userId;
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
