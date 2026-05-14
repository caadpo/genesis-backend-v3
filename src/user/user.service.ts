import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { DeepPartial } from 'typeorm';
import { UpdateUserDto } from './dtos/update-user.dto';
import { CreateUserDto } from './dtos/create-user.dto';
import { OmeEntity } from 'src/ome/entities/ome.entity';
import { UserSearchDto } from './dtos/user-search.dto';
import { createPasswordHashed, validatePassword } from 'src/utils/password';
import { ForbiddenException } from '@nestjs/common';
import { UserType } from './enum/user-type.enum';
import { QueryFailedError } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { DadosSgpEntity } from 'src/dadossgp/entities/dadossgp.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,

    @InjectRepository(DadosSgpEntity)
    private dadosSgpRepository: Repository<DadosSgpEntity>,

    @InjectRepository(OmeEntity)
    private omeRepository: Repository<OmeEntity>,
  ) {}

  private handleUniqueError(error: any): never {
    if (
      error instanceof QueryFailedError &&
      (error as any).driverError?.code === '23505'
    ) {
      const constraint = (error as any).driverError?.constraint;

      if (constraint.includes('mat')) {
        throw new BadRequestException('Essa Matrícula já está cadastrada');
      }
    }

    throw error;
  }

  async findByMatOrNomeGuerra(q: string): Promise<UserSearchDto | null> {
    const isNumber = /^\d+$/.test(q);

    const qb = this.userRepository
      .createQueryBuilder('u')
      .leftJoin('u.ome', 'ome')
      .leftJoin(DadosSgpEntity, 'dsgp', 'dsgp.matsgp = u.mat')
      .leftJoin('u.conta', 'conta')
      .select([
        'u.id          AS id',
        'u.imagem_url  AS "imagemUrl"',
        'u.mat         AS mat',
        'u.phone       AS phone',
        'u.type_user   AS "typeUser"',
        // ✅ dados pessoais agora vêm do SGP
        'dsgp.pgsgp         AS pg',
        'dsgp.ngsgp         AS "nomeGuerra"',
        'dsgp.tiposgp       AS tipo',
        'dsgp.cpfsgp        AS cpf',
        'dsgp.nunfuncsgp    AS nunfunc',
        'dsgp.nunvincsgp    AS nunvinc',
        'dsgp.situacaosgp   AS "situacao"',
        'dsgp.nomecompletosgp AS "nomeCompleto"',
        'dsgp.localapresentacaosgp AS "localApresentacao"',
        // OME
        'ome.id      AS "ome.id"',
        'ome.nomeome AS "ome.nomeOme"',
        // Conta
        'conta.id      AS "conta.id"',
        'conta.banco   AS "conta.banco"',
        'conta.agencia AS "conta.agencia"',
        'conta.conta   AS "conta.conta"',
      ]);

    if (isNumber) {
      qb.where('u.mat = :mat', { mat: q });
    } else {
      qb.where('dsgp.ngsgp ILIKE :nome', { nome: `${q}%` });
    }

    const raw = await qb.getRawOne<any>();
    if (!raw) return null;

    return {
      id: raw.id,
      imagemUrl: raw.imagemUrl,
      mat: raw.mat,
      phone: raw.phone,
      typeUser: raw.typeUser,
      pg: raw.pg,
      nomeGuerra: raw.nomeGuerra,
      tipo: raw.tipo,
      cpf: raw.cpf,
      nunfunc: raw.nunfunc,
      nunvinc: raw.nunvinc,
      nomeCompleto: raw.nomeCompleto,
      localApresentacao: raw.localApresentacao,
      situacao: raw.situacao ?? '',
      ome: raw['ome.id']
        ? { id: raw['ome.id'], nomeOme: raw['ome.nomeOme'] }
        : undefined,
      conta: raw['conta.id']
        ? {
            id: raw['conta.id'],
            banco: raw['conta.banco'],
            agencia: raw['conta.agencia'],
            conta: raw['conta.conta'],
          }
        : undefined,
    };
  }

  async createUser(dto: CreateUserDto): Promise<UserEntity> {
    const ome = await this.omeRepository.findOne({ where: { id: dto.omeId } });
    if (!ome) throw new NotFoundException('OME não encontrada');

    const DEFAULT_PASSWORD = 'genesis';
    const hashedPassword = await createPasswordHashed(DEFAULT_PASSWORD);

    const user: DeepPartial<UserEntity> = {
      mat: dto.mat,
      password: hashedPassword,
      typeUser: dto.typeUser,
      phone: dto.phone,
      imagemUrl: dto.imagemUrl,
      ome: ome,
    };

    const entity = this.userRepository.create(user);
    try {
      return await this.userRepository.save(entity);
    } catch (error) {
      this.handleUniqueError(error);
    }
  }

  // Buscar usuário
  async findById(id: number): Promise<UserEntity> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: {
        ome: true,
        conta: {
          createdByUser: true,
          updatedByUser: true,
        },
      },
    });

    if (!user) throw new NotFoundException('Usuário não encontrado');

    return user;
  }

  async findUserByMat(mat: string): Promise<any | null> {
    const usuario = await this.userRepository.findOne({
      where: { mat },
      relations: { ome: true, conta: true },
    });

    if (!usuario) return null;

    const sgp = await this.dadosSgpRepository.findOne({
      where: { matSgp: mat },
    });

    // ✅ retorna objeto combinado user + dados do SGP
    return {
      ...usuario,
      pg: sgp?.pgSgp ?? '',
      nomeGuerra: sgp?.nomeGuerraSgp ?? '',
      tipo: sgp?.tipoSgp ?? '',
      cpf: sgp?.cpfSgp ?? '',
      nunfunc: sgp?.nunfuncSgp ?? '',
      nunvinc: sgp?.nunvincSgp ?? '',
      nomeCompleto: sgp?.nomeCompletoSgp ?? '',
      localApresentacao: sgp?.localApresentacaoSgp ?? '',
      situacao: sgp?.situacaoSgp ?? '',
    };
  }

  // Editar usuário
  async updateUser(id: number, dto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.findById(id);

    if (dto.password) {
      user.password = await createPasswordHashed(dto.password);
      delete dto.password;
    }

    if (dto.omeId) {
      const ome = await this.omeRepository.findOne({
        where: { id: dto.omeId },
      });
      if (!ome) throw new NotFoundException('OME não encontrada');
      user.ome = ome;
    }

    Object.assign(user, dto);
    return await this.userRepository.save(user);
  }

  async changeOwnPassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.findById(userId);

    const match = await validatePassword(currentPassword, user.password);
    if (!match) {
      throw new ForbiddenException('Senha atual incorreta');
    }

    user.password = await createPasswordHashed(newPassword);
    await this.userRepository.save(user);
  }

  async resetPasswordToGenesis(
    requesterId: number,
    targetUserId: number,
  ): Promise<void> {
    const requester = await this.findById(requesterId);
    const target = await this.findById(targetUserId);

    const isMasterOrTecnico =
      requester.typeUser === UserType.MASTER ||
      requester.typeUser === UserType.TECNICO;

    const isAuxiliarSameOme =
      requester.typeUser === UserType.AUXILIAR &&
      requester.omeId === target.omeId;

    if (!isMasterOrTecnico && !isAuxiliarSameOme) {
      throw new ForbiddenException(
        'Sem permissão para resetar a senha deste usuário',
      );
    }

    const DEFAULT_PASSWORD = 'genesis';
    target.password = await createPasswordHashed(DEFAULT_PASSWORD);
    await this.userRepository.save(target);
  }

  async updateOwnImagem(
    userId: number,
    imagemUrl: string,
  ): Promise<UserEntity> {
    const user = await this.findById(userId);
    user.imagemUrl = imagemUrl;
    return await this.userRepository.save(user);
  }

  async updateOwnPhone(userId: number, phone: string): Promise<UserEntity> {
    const user = await this.findById(userId);

    user.phone = phone;

    return await this.userRepository.save(user);
  }

  // Excluir usuário
  async deleteUser(id: number): Promise<void> {
    const user = await this.findById(id);
    await this.userRepository.remove(user);
  }
}
