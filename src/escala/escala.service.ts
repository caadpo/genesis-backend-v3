import {
  BadRequestException,
  ForbiddenException, // ✅ adicionar
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { EscalaEntity } from './entities/escala.entity';
import { CreateEscalaDto } from './dtos/create-escala.dto';
import { UpdateEscalaDto } from './dtos/update-escala.dto';
import { ReturnEscalaDto } from './dtos/return-escala.dto';
import { UserEntity } from 'src/user/entities/user.entity';
import { Operacao } from 'src/operacao/entities/operacao.entity';
import { UserType } from 'src/user/enum/user-type.enum';

@Injectable()
export class EscalaService {
  constructor(
    @InjectRepository(EscalaEntity)
    private readonly repo: Repository<EscalaEntity>,

    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,

    @InjectRepository(Operacao)
    private readonly operacaoRepo: Repository<Operacao>,
  ) {}

  // ─── Verificação de OME para AUXILIAR ───────────────────────────────────────
  private async verificarPermissaoOme(
    operacaoId: number,
    usuarioLogado: { id: number; typeUser: number; omeId: number },
  ): Promise<void> {
    if (Number(usuarioLogado.typeUser) !== UserType.AUXILIAR) return; // ✅ só restringe AUXILIAR

    const operacao = await this.operacaoRepo.findOne({
      where: { id: operacaoId },
      relations: { evento: { ome: true } },
    });

    if (!operacao) throw new NotFoundException('Operação não encontrada');

    const omeDoEvento = operacao.evento?.ome?.id;

    if (omeDoEvento !== usuarioLogado.omeId) {
      throw new ForbiddenException(
        'Você só pode inserir registros em operações da sua OME',
      );
    }
  }

  // ─── Cálculo da cota ────────────────────────────────────────────────────────
  private calcularCota(horaInicio: string, horaFim: string): number {
    return horaInicio === horaFim ? 2 : 1;
  }

  // ─── Verificação de conflito ─────────────────────────────────────────────────
  private async verificarConflito(
    mat: number,
    dataInicio: string,
    sistema: string,
    excludeId?: number,
  ): Promise<void> {
    const qb = this.repo
      .createQueryBuilder('e')
      .where('e.mat = :mat', { mat })
      .andWhere('e.data_inicio = :dataInicio', { dataInicio })
      .andWhere('e.sistema = :sistema', { sistema });

    if (excludeId) qb.andWhere('e.id != :excludeId', { excludeId });

    const existe = await qb.getExists();
    if (existe) {
      throw new BadRequestException(
        `Matrícula ${mat} já está escalada nesta data para o sistema ${sistema}`,
      );
    }
  }

  // ─── Verificação do teto ─────────────────────────────────────────────────────
  private async verificarTeto(
    operacaoId: number,
    tipoEscala: string,
    novaCota: number,
    excludeId?: number,
  ): Promise<void> {
    const operacao = await this.operacaoRepo.findOneBy({ id: operacaoId });
    if (!operacao) throw new NotFoundException('Operação não encontrada');

    const qb = this.repo
      .createQueryBuilder('e')
      .select('COALESCE(SUM(e.cota_escala), 0)', 'soma')
      .where('e.operacao_id = :operacaoId', { operacaoId })
      .andWhere('e.tipo_escala = :tipoEscala', { tipoEscala });

    if (excludeId) qb.andWhere('e.id != :excludeId', { excludeId });

    const { soma } = await qb.getRawOne();
    const somaAtual = Number(soma);

    if (
      tipoEscala === 'O' &&
      somaAtual + novaCota > operacao.qtd_oficiais_oper
    ) {
      throw new BadRequestException(
        'Não há mais cotas de Oficiais disponíveis para essa Operação',
      );
    }

    if (tipoEscala === 'P' && somaAtual + novaCota > operacao.qtd_pracas_oper) {
      throw new BadRequestException(
        'Não há mais cotas de Praças disponíveis para essa Operação',
      );
    }
  }

  // ─── CREATE ─────────────────────────────────────────────────────────────────
  async create(
    dto: CreateEscalaDto,
    usuarioLogado: { id: number; typeUser: number; omeId: number },
  ): Promise<ReturnEscalaDto> {
    // ✅ Verifica permissão de OME antes de qualquer coisa
    await this.verificarPermissaoOme(dto.operacaoId, usuarioLogado);

    const usuario = await this.userRepo.findOne({
      where: { id: dto.usuarioId },
      relations: { ome: true, conta: true },
    });
    if (!usuario) throw new NotFoundException('Usuário não encontrado');

    await this.verificarConflito(usuario.mat, dto.dataInicio, dto.sistema);

    const cota = this.calcularCota(dto.horaInicio, dto.horaFim);
    await this.verificarTeto(dto.operacaoId, usuario.tipo, cota);

    const escala = this.repo.create({
      sistema: dto.sistema,
      mat: usuario.mat,
      operacao: { id: dto.operacaoId },
      usuario: { id: dto.usuarioId },
      cpf_escala: usuario.cpf,
      pg_escala: usuario.pg,
      tipo_escala: usuario.tipo,
      nome_escala: usuario.nomeGuerra,
      phone_escala: usuario.phone,
      nomeome_escala: usuario.ome?.nomeOme ?? '',
      banco_escala: usuario.conta?.banco ?? '',
      agencia_escala: usuario.conta?.agencia ?? '',
      conta_escala: usuario.conta?.conta ?? '',
      dataInicio: dto.dataInicio,
      horaInicio: dto.horaInicio,
      horaFim: dto.horaFim,
      cota_escala: cota,
      localApresentacao: dto.localApresentacao ?? 'SEDE DA OME',
      funcao: dto.funcao,
      situacao: dto.situacao ?? 'REGULAR',
      anotacoes: dto.anotacoes,
    });

    console.log('Escala a ser salva:', escala); // ✅ log para debug

    const saved = await this.repo.save(escala);
    return this.findOne(saved.id);
  }

  // ─── FIND BY OPERACAO ────────────────────────────────────────────────────────
  async findByOperacao(operacaoId: number): Promise<ReturnEscalaDto[]> {
    // ✅ Sem joins desnecessários — todos os dados já estão na própria tabela
    const escalas = await this.repo.find({
      where: { operacao: { id: operacaoId } },
      order: { dataInicio: 'ASC', horaInicio: 'ASC' },
    });

    return escalas.map((e) => new ReturnEscalaDto(e));
  }

  // ─── FIND ONE ────────────────────────────────────────────────────────────────
  async findOne(id: number): Promise<ReturnEscalaDto> {
    const escala = await this.repo.findOne({ where: { id } });
    if (!escala) throw new NotFoundException('Escala não encontrada');
    return new ReturnEscalaDto(escala);
  }

  // ─── FIND BY MATRICULA — PJES ────────────────────────────────────────────────
  async findByMatriculaPjes(
    mat: number,
    mes: number,
    ano: number,
  ): Promise<ReturnEscalaDto[]> {
    const escalas = await this.repo
      .createQueryBuilder('e')
      .where('e.mat = :mat', { mat })
      .andWhere('e.sistema = :sistema', { sistema: 'PJES' })
      .andWhere('EXTRACT(MONTH FROM e.data_inicio) = :mes', { mes })
      .andWhere('EXTRACT(YEAR FROM e.data_inicio) = :ano', { ano })
      .orderBy('e.data_inicio', 'ASC')
      .addOrderBy('e.hora_inicio', 'ASC')
      .getMany();

    return escalas.map((e) => new ReturnEscalaDto(e));
  }

  // ─── FIND BY MATRICULA — DIARIAS ─────────────────────────────────────────────
  async findByMatriculaDiarias(
    mat: number,
    dataInicio: string,
    dataFim: string,
  ): Promise<ReturnEscalaDto[]> {
    const escalas = await this.repo
      .createQueryBuilder('e')
      .where('e.mat = :mat', { mat })
      .andWhere('e.sistema = :sistema', { sistema: 'DIARIAS' })
      .andWhere('e.data_inicio BETWEEN :dataInicio AND :dataFim', {
        dataInicio,
        dataFim,
      })
      .orderBy('e.data_inicio', 'ASC')
      .addOrderBy('e.hora_inicio', 'ASC')
      .getMany();

    return escalas.map((e) => new ReturnEscalaDto(e));
  }

  // ─── UPDATE ──────────────────────────────────────────────────────────────────
  async update(
    id: number,
    dto: UpdateEscalaDto,
    usuarioLogado: { id: number; typeUser: number; omeId: number },
  ): Promise<ReturnEscalaDto> {
    const escala = await this.repo.findOne({
      where: { id },
      relations: { operacao: true },
    });
    if (!escala) throw new NotFoundException('Escala não encontrada');

    const operacaoId = dto.operacaoId ?? escala.operacao.id;

    // ✅ Verifica permissão de OME
    await this.verificarPermissaoOme(operacaoId, usuarioLogado);

    if (dto.usuarioId) {
      const usuario = await this.userRepo.findOne({
        where: { id: dto.usuarioId },
        relations: { ome: true, conta: true },
      });
      if (!usuario) throw new NotFoundException('Usuário não encontrado');

      escala.mat = usuario.mat;
      escala.cpf_escala = usuario.cpf;
      escala.pg_escala = usuario.pg;
      escala.tipo_escala = usuario.tipo;
      escala.nome_escala = usuario.nomeGuerra;
      escala.phone_escala = usuario.phone;
      escala.nomeome_escala = usuario.ome?.nomeOme ?? '';
      escala.banco_escala = usuario.conta?.banco ?? '';
      escala.agencia_escala = usuario.conta?.agencia ?? '';
      escala.conta_escala = usuario.conta?.conta ?? '';
      escala.usuario = { id: dto.usuarioId } as UserEntity;
    }

    const novaData = dto.dataInicio ?? escala.dataInicio;
    const novaSistema = dto.sistema ?? escala.sistema;
    const novaHoraInicio = dto.horaInicio ?? escala.horaInicio;
    const novaHoraFim = dto.horaFim ?? escala.horaFim;
    const novaCota = this.calcularCota(novaHoraInicio, novaHoraFim);

    await this.verificarConflito(escala.mat, novaData, novaSistema, id);
    await this.verificarTeto(operacaoId, escala.tipo_escala, novaCota, id);

    Object.assign(escala, {
      ...(dto.dataInicio && { dataInicio: dto.dataInicio }),
      ...(dto.horaInicio && { horaInicio: dto.horaInicio }),
      ...(dto.horaFim && { horaFim: dto.horaFim }),
      cota_escala: novaCota,
      ...(dto.localApresentacao && {
        localApresentacao: dto.localApresentacao,
      }),
      ...(dto.funcao && { funcao: dto.funcao }),
      ...(dto.situacao && { situacao: dto.situacao }),
      ...(dto.anotacoes !== undefined && { anotacoes: dto.anotacoes }),
      ...(dto.operacaoId && { operacao: { id: dto.operacaoId } }),
      ...(dto.sistema && { sistema: dto.sistema }),
    });

    await this.repo.save(escala);
    return this.findOne(id);
  }

  // ─── DELETE ──────────────────────────────────────────────────────────────────
  async remove(
    id: number,
    usuarioLogado: { id: number; typeUser: number; omeId: number },
  ): Promise<void> {
    const escala = await this.repo.findOne({
      where: { id },
      relations: { operacao: true },
    });
    if (!escala) throw new NotFoundException('Escala não encontrada');

    // ✅ Verifica permissão de OME também no delete
    await this.verificarPermissaoOme(escala.operacao.id, usuarioLogado);

    await this.repo.delete(id);
  }
}
