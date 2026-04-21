import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { DeepPartial } from 'typeorm';
import { UpdateUserDto } from './dtos/update-user.dto';
import { CreateUserDto } from './dtos/create-user.dto';
import { OmeEntity } from 'src/ome/entities/ome.entity';
import { UserSearchDto } from './dtos/user-search.dto';
import { compare, hash } from 'bcrypt';
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

  private calcularTipoPorPg(pg: string): 'P' | 'O' {
    const pracas = ['SD', 'CB', '3º SGT', '2º SGT', '1º SGT', 'ST'];
    const oficiais = ['ASP', '2º TEN', '1º TEN', 'CAP', 'MAJ', 'TC', 'CEL'];

    if (pracas.includes(pg)) return 'P';
    if (oficiais.includes(pg)) return 'O';

    return 'P';
  }

  private handleUniqueError(error: any): never {
    if (
      error instanceof QueryFailedError &&
      (error as any).driverError?.code === '23505'
    ) {
      const constraint = (error as any).driverError?.constraint;

      if (constraint.includes('loginsei')) {
        throw new BadRequestException('Esse login SEI já está cadastrado');
      }

      if (constraint.includes('cpf')) {
        throw new BadRequestException('Esse CPF já está cadastrado');
      }

      if (constraint.includes('mat')) {
        throw new BadRequestException('Essa matrícula já está cadastrada');
      }

      if (constraint.includes('nunfunc')) {
        throw new BadRequestException('Esse Nº Funcional já está cadastrado');
      }
    }

    throw error;
  }

  // Criar usuário
  async createUser(dto: CreateUserDto): Promise<UserEntity> {
    const ome = await this.omeRepository.findOne({ where: { id: dto.omeId } });
    if (!ome) throw new NotFoundException('OME não encontrada');

    const DEFAULT_PASSWORD = 'genesis';
    const hashedPassword = await hash(DEFAULT_PASSWORD, 10);

    const user: DeepPartial<UserEntity> = {
      loginSei: dto.loginSei,
      password: hashedPassword,
      typeUser: dto.typeUser,
      pg: dto.pg,
      mat: dto.mat,
      nomeGuerra: dto.nomeGuerra,
      tipo: this.calcularTipoPorPg(dto.pg),
      cpf: dto.cpf,
      nunfunc: dto.nunfunc,
      nunvinc: dto.nunvinc,
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

  async findByMatOrNomeGuerra(q: string): Promise<UserSearchDto | null> {
    const isNumber = /^\d+$/.test(q);

    const qb = this.userRepository
      .createQueryBuilder('u')
      .leftJoin('u.ome', 'ome')
      .leftJoin(DadosSgpEntity, 'dsgp', 'dsgp.matsgp = u.mat')
      .select([
        'u.id        AS id',
        'u.pg        AS pg',
        'u.ng        AS "nomeGuerra"',
        'u.tipo        AS "tipo"',
        'u.imagem_url AS "imagemUrl"',
        'u.mat       AS mat',
        'u.loginsei  AS "loginSei"',
        'u.phone     AS phone',
        'u.type_user AS "typeUser"',
        'u.cpf       AS cpf',
        'u.nunfunc   AS nunfunc',
        'u.nunvinc   AS nunvinc',
        'ome.id      AS "ome.id"',
        'ome.nomeome AS "ome.nomeOme"',
        'dsgp.situacaosgp AS "situacaoSgp"',
      ]);

    if (isNumber) {
      qb.where('u.mat = :mat', { mat: Number(q) });
    } else {
      qb.where('u.ng ILIKE :nome', { nome: `${q}%` });
    }

    const raw = await qb.getRawOne<any>();
    if (!raw) return null;

    return {
      id: raw.id,
      pg: raw.pg,
      nomeGuerra: raw.nomeGuerra,
      tipo: raw.tipo,
      imagemUrl: raw.imagemUrl,
      mat: raw.mat,
      loginSei: raw.loginSei,
      phone: raw.phone,
      typeUser: raw.typeUser,
      cpf: raw.cpf,
      nunfunc: raw.nunfunc,
      nunvinc: raw.nunvinc,
      situacaoSgp: raw.situacaoSgp ?? 'REGULAR',
      ome: raw['ome.id']
        ? {
            id: raw['ome.id'],
            nomeOme: raw['ome.nomeOme'],
          }
        : undefined,
    };
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

  async findUserByLoginSei(loginSei: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: { loginSei },
      relations: {
        ome: true,
        conta: {
          createdByUser: true,
          updatedByUser: true,
        },
      },
    });
  }

  // Editar usuário
  async updateUser(id: number, dto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.findById(id);

    if (dto.password) {
      user.password = await hash(dto.password, 10);
      delete dto.password;
    }

    if (dto.omeId) {
      const ome = await this.omeRepository.findOne({
        where: { id: dto.omeId },
      });
      if (!ome) throw new NotFoundException('OME não encontrada');
      user.ome = ome;
    }

    if (dto.pg) {
      user.tipo = this.calcularTipoPorPg(dto.pg);
    }

    Object.assign(user, dto);
    try {
      return await this.userRepository.save(user);
    } catch (error) {
      this.handleUniqueError(error);
    }
  }

  async changeOwnPassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.findById(userId);

    const match = await compare(currentPassword, user.password);
    if (!match) {
      throw new ForbiddenException('Senha atual incorreta');
    }

    user.password = await hash(newPassword, 10);
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
    target.password = await hash(DEFAULT_PASSWORD, 10);
    await this.userRepository.save(target);
  }

  // Excluir usuário
  async deleteUser(id: number): Promise<void> {
    const user = await this.findById(id);
    await this.userRepository.remove(user);
  }
}
