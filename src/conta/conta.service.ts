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
      cod_banco: conta.cod_banco,
      agencia: conta.agencia,
      conta: conta.conta,
      dig_conta: conta.dig_conta,
      isEfisco: conta.isEfisco,
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
    const conta = await this.repo.findOne({ where: { id } });

    if (!conta) {
      throw new NotFoundException('Conta não encontrada');
    }

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

  // ─── Usuário logado atualiza a própria conta ──────────────────────────────
  // Sempre marca isEfisco = false para sinalizar pendência ao FINANCEIRO
  async atualizarPropriaConta(usuarioId: number, dto: UpdateContaDto) {
    const conta = await this.repo.findOne({ where: { usuarioId } });

    if (!conta) {
      throw new NotFoundException(
        'Conta não encontrada. Solicite o cadastro a um Auxiliar ou ao Financeiro.',
      );
    }

    Object.assign(conta, dto);
    conta.updatedByUserId = usuarioId;
    conta.isEfisco = false; // indica que há pendência de atualização no e-Fisco

    try {
      return await this.repo.save(conta);
    } catch {
      throw new ConflictException('Erro ao atualizar conta.');
    }
  }

  // ─── FINANCEIRO confirma atualização no sistema de finanças ───────────────
  async confirmarEfisco(contaId: number, user: UserEntity) {
    if (
      user.typeUser !== UserType.FINANCEIRO &&
      user.typeUser !== UserType.MASTER &&
      user.typeUser !== UserType.TECNICO
    ) {
      throw new ForbiddenException(
        'Apenas o Financeiro pode confirmar a atualização no e-Fisco',
      );
    }

    const conta = await this.repo.findOne({ where: { id: contaId } });
    if (!conta) throw new NotFoundException('Conta não encontrada');

    conta.isEfisco = true;
    conta.updatedByUserId = user.id;

    return await this.repo.save(conta);
  }

  // ─── Lista contas pendentes de confirmação no e-Fisco ────────────────────
  async listarPendentesEfisco(user: UserEntity) {
    const tiposPermitidos = [
      UserType.FINANCEIRO,
      UserType.MASTER,
      UserType.TECNICO,
    ];

    if (!tiposPermitidos.includes(user.typeUser)) {
      throw new ForbiddenException('Sem permissão para visualizar esta lista');
    }

    const pendentes = await this.repo.find({
      where: { isEfisco: false },
      relations: {
        usuario: { ome: true },
        updatedByUser: true,
      },
      order: { updatedAt: 'DESC' },
    });

    return pendentes.map((c) => ({
      id: c.id,
      banco: c.banco,
      cod_banco: c.cod_banco,
      agencia: c.agencia,
      conta: c.conta,
      dig_conta: c.dig_conta,
      updatedAt: c.updatedAt,
      usuarioId: c.usuarioId,
      usuario: c.usuario
        ? {
            id: c.usuario.id,
            mat: c.usuario.mat,
            omeId: c.usuario.omeId,
            ome: c.usuario.ome
              ? { id: c.usuario.ome.id, nomeOme: c.usuario.ome.nomeOme }
              : null,
          }
        : null,
      atualizadoPor: c.updatedByUser
        ? { id: c.updatedByUser.id, mat: c.updatedByUser.mat }
        : null,
    }));
  }

  async remover(id: number) {
    await this.repo.delete(id);
  }
}
