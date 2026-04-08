import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { DeepPartial } from 'typeorm';
import { UpdateUserDto } from './dtos/update-user.dto';
import { CreateUserDto } from './dtos/create-user.dto';
import { OmeEntity } from 'src/ome/entities/ome.entity';
import { hash } from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,

    @InjectRepository(OmeEntity)
    private omeRepository: Repository<OmeEntity>,
  ) {}

  // Criar usuário
  async createUser(dto: CreateUserDto): Promise<UserEntity> {
    const ome = await this.omeRepository.findOne({ where: { id: dto.omeId } });
    if (!ome) throw new NotFoundException('OME não encontrada');

    const hashedPassword = await hash(dto.password, 10);

    const user: DeepPartial<UserEntity> = {
      loginSei: dto.loginSei,
      password: hashedPassword,
      typeUser: dto.typeUser,
      pg: dto.pg,
      mat: dto.mat,
      nomeGuerra: dto.nomeGuerra,
      tipo: dto.tipo,
      funcao: dto.funcao,
      phone: dto.phone,
      imagemUrl: dto.imagemUrl,
      ome: ome,
    };

    const entity = this.userRepository.create(user);
    return this.userRepository.save(entity);
  }

  // Buscar usuário
  async findById(id: number): Promise<UserEntity> {
    const user = await this.userRepository.findOne({
      where: { id },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async findUserByLoginSei(loginSei: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: { loginSei },
      relations: ['ome'],
    });
  }

  // Editar usuário
  async updateUser(id: number, dto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.findById(id);

    if (dto.omeId) {
      const ome = await this.omeRepository.findOne({
        where: { id: dto.omeId },
      });
      if (!ome) throw new NotFoundException('OME não encontrada');
      user.ome = ome;
    }

    Object.assign(user, dto);
    return this.userRepository.save(user);
  }

  // Excluir usuário
  async deleteUser(id: number): Promise<void> {
    const user = await this.findById(id);
    await this.userRepository.remove(user);
  }
}
