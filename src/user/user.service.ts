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
      const constraint: string | undefined = (error as any).driverError
        ?.constraint;

      if (constraint?.includes('mat')) {
        throw new BadRequestException('Essa Matrícula já está cadastrada');
      }
    }

    throw error;
  }

  // Lê o usuário logado do banco, não do JWT (que pode estar desatualizado)
  private async getRequester(id: number) {
    const u = await this.userRepository.findOne({ where: { id } });
    if (!u) throw new ForbiddenException('Usuário logado não encontrado');
    return { id: u.id, typeUser: Number(u.typeUser), omeId: u.omeId };
  }

  // Auxiliar só pode agir sobre alvos AUXILIAR ou COMUN
  private isAlvoPermitidoParaAuxiliar(typeUser: UserType | number): boolean {
    const t = Number(typeUser);
    return t === UserType.AUXILIAR || t === UserType.COMUN;
  }

  // Remove o hash da senha antes de devolver ao controller
  private semSenha<T extends { password?: string }>(
    user: T,
  ): Omit<T, 'password'> {
    const { password, ...rest } = user;
    return rest;
  }

  async toggleAtivo(
    targetId: number,
    usuarioJwt: { id: number; typeUser: number; omeId: number },
  ): Promise<{ ativo: boolean }> {
    const usuarioLogado = await this.getRequester(usuarioJwt.id);

    const isMasterOuTecnico =
      usuarioLogado.typeUser === UserType.MASTER ||
      usuarioLogado.typeUser === UserType.TECNICO;
    const isAuxiliar = usuarioLogado.typeUser === UserType.AUXILIAR;

    if (!isMasterOuTecnico && !isAuxiliar) {
      throw new ForbiddenException(
        'Sem permissão para alterar status do usuário',
      );
    }

    const target = await this.findById(targetId);

    if (isAuxiliar) {
      if (target.omeId !== usuarioLogado.omeId) {
        throw new ForbiddenException(
          'Auxiliar só pode alterar usuários da sua OME',
        );
      }
      if (!this.isAlvoPermitidoParaAuxiliar(target.typeUser)) {
        throw new ForbiddenException(
          'Auxiliar não pode alterar usuários com perfil superior',
        );
      }
    }

    target.ativo = !target.ativo;
    await this.userRepository.save(target);

    return { ativo: target.ativo };
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
        'u.ativo       AS ativo',
        'u.type_user   AS "typeUser"',
        'dsgp.pgsgp         AS pg',
        'dsgp.nomeguerrasgp AS "nomeGuerra"',
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
        'conta.cod_banco   AS "conta.cod_banco"',
        'conta.agencia AS "conta.agencia"',
        'conta.conta   AS "conta.conta"',
        'conta.dig_conta   AS "conta.dig_conta"',
      ]);

    if (isNumber) {
      qb.where("LTRIM(u.mat::text, '0') = LTRIM(:mat::text, '0')", {
        mat: q,
      });
    } else {
      qb.where('dsgp.nomeguerrasgp ILIKE :nome', { nome: `${q}%` });
    }

    const raw = await qb.getRawOne<any>();
    if (!raw) return null;

    return {
      id: raw.id,
      imagemUrl: raw.imagemUrl,
      mat: raw.mat,
      phone: raw.phone,
      ativo: raw.ativo,
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
            cod_banco: raw['conta.cod_banco'],
            agencia: raw['conta.agencia'],
            conta: raw['conta.conta'],
            dig_conta: raw['conta.dig_conta'],
          }
        : undefined,
    };
  }

  async listUsuariosEspeciais(limit?: number): Promise<UserSearchDto[]> {
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
        'u.ativo       AS ativo',
        'u.type_user   AS "typeUser"',
        'dsgp.pgsgp         AS pg',
        'dsgp.nomeguerrasgp AS "nomeGuerra"',
        'dsgp.tiposgp       AS tipo',
        'dsgp.cpfsgp        AS cpf',
        'dsgp.nunfuncsgp    AS nunfunc',
        'dsgp.nunvincsgp    AS nunvinc',
        'dsgp.situacaosgp   AS "situacao"',
        'dsgp.nomecompletosgp AS "nomeCompleto"',
        'dsgp.localapresentacaosgp AS "localApresentacao"',
        'ome.id      AS "ome.id"',
        'ome.nomeome AS "ome.nomeOme"',
        'conta.id      AS "conta.id"',
        'conta.banco   AS "conta.banco"',
        'conta.cod_banco   AS "conta.cod_banco"',
        'conta.agencia AS "conta.agencia"',
        'conta.conta   AS "conta.conta"',
        'conta.dig_conta   AS "conta.dig_conta"',
      ])
      .where('u.type_user != :comun', { comun: UserType.COMUN })
      .andWhere('u.ativo = true') // remova se quiser mostrar inativos também
      .orderBy('RANDOM()');

    if (limit) {
      qb.limit(limit);
    }

    const rows = await qb.getRawMany<any>();

    return rows.map((raw) => ({
      id: raw.id,
      imagemUrl: raw.imagemUrl,
      mat: raw.mat,
      phone: raw.phone,
      ativo: raw.ativo,
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
            cod_banco: raw['conta.cod_banco'],
            agencia: raw['conta.agencia'],
            conta: raw['conta.conta'],
            dig_conta: raw['conta.dig_conta'],
          }
        : undefined,
    }));
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
  async updateUser(
    id: number,
    dto: UpdateUserDto,
    usuarioJwt: { id: number; typeUser: number; omeId: number },
  ): Promise<UserEntity> {
    const usuarioLogado = await this.getRequester(usuarioJwt.id);

    const isMaster = usuarioLogado.typeUser === UserType.MASTER;
    const isAuxiliar = usuarioLogado.typeUser === UserType.AUXILIAR;

    if (!isMaster && !isAuxiliar) {
      throw new ForbiddenException('Sem permissão para atualizar usuários');
    }

    const user = await this.findById(id);

    if (isAuxiliar) {
      if (user.omeId !== usuarioLogado.omeId) {
        throw new ForbiddenException(
          'Auxiliar só pode atualizar usuários da sua OME',
        );
      }

      // não pode editar quem tem perfil acima de AUXILIAR/COMUN
      const tipoAlvo = Number(user.typeUser);
      if (tipoAlvo !== UserType.AUXILIAR && tipoAlvo !== UserType.COMUN) {
        throw new ForbiddenException(
          'Auxiliar não pode alterar usuários com perfil superior',
        );
      }

      if (
        dto.typeUser !== undefined &&
        Number(dto.typeUser) !== UserType.AUXILIAR &&
        Number(dto.typeUser) !== UserType.COMUN
      ) {
        throw new ForbiddenException(
          'Auxiliar só pode definir o tipo de usuário como Auxiliar ou Comum',
        );
      }

      // opcional: impedir auto-transferência
      if (
        dto.omeId !== undefined &&
        dto.omeId !== user.omeId &&
        user.id === usuarioLogado.id
      ) {
        throw new ForbiddenException('Você não pode transferir a si mesmo');
      }
    }

    const { omeId, password, ...campos } = dto;

    if (password) {
      user.password = await createPasswordHashed(password);
    }

    Object.assign(user, campos);

    // Transferência de OME
    if (omeId !== undefined && omeId !== user.omeId) {
      const novaOme = await this.omeRepository.findOne({
        where: { id: omeId },
      });
      if (!novaOme) throw new NotFoundException('OME não encontrada');

      user.ome = novaOme;
      user.omeId = novaOme.id;
      user.typeUser = UserType.COMUN; // sempre vira COMUM ao ser transferido
    }

    try {
      return this.semSenha(await this.userRepository.save(user)) as UserEntity;
    } catch (error) {
      this.handleUniqueError(error);
    }
  }

  async changeOwnPassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userRepository
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.id = :id', { id: userId })
      .getOne();

    if (!user) throw new NotFoundException('Usuário não encontrado');

    const match = await validatePassword(currentPassword, user.password);
    if (!match) throw new ForbiddenException('Senha atual incorreta');

    user.password = await createPasswordHashed(newPassword);
    await this.userRepository.save(user);
  }

  async resetPasswordToGenesis(
    requesterId: number,
    targetUserId: number,
  ): Promise<void> {
    const requester = await this.findById(requesterId);
    const target = await this.findById(targetUserId);

    const isMaster = Number(requester.typeUser) === UserType.MASTER;

    const isAuxiliarValido =
      Number(requester.typeUser) === UserType.AUXILIAR &&
      requester.omeId === target.omeId &&
      this.isAlvoPermitidoParaAuxiliar(target.typeUser);

    if (!isMaster && !isAuxiliarValido) {
      throw new ForbiddenException(
        'Sem permissão para resetar a senha deste usuário',
      );
    }

    target.password = await createPasswordHashed('genesis');
    await this.userRepository.save(target);
  }

  async updateOwnImagem(
    userId: number,
    imagemUrl: string,
  ): Promise<UserEntity> {
    const user = await this.findById(userId);
    user.imagemUrl = imagemUrl;
    return this.semSenha(await this.userRepository.save(user)) as UserEntity;
  }

  async updateOwnPhone(userId: number, phone: string): Promise<UserEntity> {
    const user = await this.findById(userId);

    user.phone = phone;

    return this.semSenha(await this.userRepository.save(user)) as UserEntity;
  }

  // Excluir usuário
  async deleteUser(id: number): Promise<void> {
    const user = await this.findById(id);
    await this.userRepository.remove(user);
  }
}
