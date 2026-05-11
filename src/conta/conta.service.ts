import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContaEntity } from './entities/conta.entity';
import { CreateContaDto } from './dtos/create-conta.dto';
import { UpdateContaDto } from './dtos/update-conta.dto';
import { ReturnContaDto } from './dtos/return-conta.dto';
import { UserType } from 'src/user/enum/user-type.enum';
import { UserEntity } from 'src/user/entities/user.entity';

@Injectable()
export class ContaService {
  constructor(
    @InjectRepository(ContaEntity)
    private repo: Repository<ContaEntity>,
    @InjectRepository(UserEntity)
    private userRepo: Repository<UserEntity>,
  ) {}

  private validarPermissao(user: any, usuarioAlvo: UserEntity) {
    const tiposPermitidos = [
      UserType.AUXILIAR,
      UserType.FINANCEIRO,
      UserType.MASTER,
    ];

    if (!tiposPermitidos.includes(user.typeUser)) {
      throw new ForbiddenException('Você não tem permissão para essa ação');
    }

    if (
      user.typeUser === UserType.AUXILIAR &&
      UserType.FINANCEIRO &&
      user.omeId !== usuarioAlvo.omeId
    ) {
      throw new ForbiddenException('Policial não pertence a sua UNIDADE');
    }
  }

  async criar(dto: CreateContaDto, user: UserEntity) {
    // 🔒 Regra 1: tipos permitidos

    // 🔍 Buscar usuário alvo (quem vai receber a conta)
    const usuarioAlvo = await this.userRepo.findOne({
      where: { id: dto.usuarioId },
    });

    if (!usuarioAlvo) {
      throw new NotFoundException('Usuário não encontrado');
    }

    this.validarPermissao(user, usuarioAlvo);

    try {
      const conta = this.repo.create({
        ...dto,
        createdByUserId: user.id,
        updatedByUserId: user.id,
      });

      return await this.repo.save(conta);
    } catch {
      throw new ConflictException(
        'Usuário já possui conta ou esta conta já está cadastrada.',
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
            mat: conta.createdByUser.mat,
          }
        : null,

      updatedBy: conta.updatedByUser
        ? {
            id: conta.updatedByUser.id,
            mat: conta.updatedByUser.mat,
          }
        : null,
    } as ReturnContaDto;
  }

  async atualizar(id: number, dto: UpdateContaDto, user: UserEntity) {
    // 🔍 Buscar conta + dono dela
    const conta = await this.repo.findOne({
      where: { id },
    });

    if (!conta) {
      throw new NotFoundException('Conta não encontrada');
    }

    // 🔍 Buscar usuário dono da conta
    const usuarioAlvo = await this.userRepo.findOne({
      where: { id: conta.usuarioId },
    });

    if (!usuarioAlvo) {
      throw new NotFoundException('Usuário da conta não encontrado');
    }

    this.validarPermissao(user, usuarioAlvo);

    try {
      Object.assign(conta, dto);
      conta.updatedByUserId = user.id;

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
