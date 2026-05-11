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
import { DadosSgpEntity } from 'src/dadossgp/entities/dadossgp.entity';

@Injectable()
export class EscalaService {
  constructor(
    @InjectRepository(EscalaEntity)
    private readonly repo: Repository<EscalaEntity>,

    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,

    @InjectRepository(Operacao)
    private readonly operacaoRepo: Repository<Operacao>,

    @InjectRepository(DadosSgpEntity)
    private readonly dadosSgpRepo: Repository<DadosSgpEntity>,
  ) {}

  // ─── Método para buscar dados combinados: ───────────────────────────────────────

  // ✅ Uma única query traz user + sgp + ome + conta
  private async buscarDadosParaEscala(usuarioId: number): Promise<{
    usuario: UserEntity;
    sgp: DadosSgpEntity | null;
  }> {
    const row = await this.userRepo
      .createQueryBuilder('u')
      .leftJoinAndMapOne('u.conta', 'u.conta', 'conta')
      .leftJoinAndMapOne('u.ome', 'u.ome', 'ome')
      .where('u.id = :id', { id: usuarioId })
      .getOne();

    if (!row) throw new NotFoundException('Usuário não encontrado');

    const sgp = await this.dadosSgpRepo.findOne({
      where: { matSgp: row.mat },
      select: {
        pgSgp: true,
        nomeGuerraSgp: true,
        tipoSgp: true,
        cpfSgp: true,
        nunfuncSgp: true,
        nunvincSgp: true,
        localApresentacaoSgp: true,
        situacaoSgp: true,
      },
    });

    return { usuario: row, sgp };
  }

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
    mat: string,
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
    // ✅ duas queries paralelas — sem problema de GROUP BY
    const [operacao, somaResult] = await Promise.all([
      this.operacaoRepo.findOneBy({ id: operacaoId }),

      (() => {
        const qb = this.repo
          .createQueryBuilder('e')
          .select('COALESCE(SUM(e.cota_escala), 0)', 'soma')
          .where('e.operacao_id = :operacaoId', { operacaoId })
          .andWhere('e.tipo_escala = :tipoEscala', { tipoEscala });

        if (excludeId) qb.andWhere('e.id != :excludeId', { excludeId });

        return qb.getRawOne();
      })(),
    ]);

    if (!operacao) throw new NotFoundException('Operação não encontrada');

    const somaAtual = Number(somaResult.soma);

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

  // ─── Verificação de status do evento ────────────────────────────────────────
  private async verificarStatusEvento(operacaoId: number): Promise<void> {
    const operacao = await this.operacaoRepo.findOne({
      where: { id: operacaoId },
      relations: { evento: true },
    });

    if (!operacao) throw new NotFoundException('Operação não encontrada');

    const status = operacao.evento.status_evento;

    if (status !== 'CRIADO') {
      const statusFormatado =
        status === 'HOMOLOGADO'
          ? 'Homologado'
          : status === 'PD_CONCLUIDA'
            ? 'com PD Concluída'
            : status === 'PAGO'
              ? 'Pago'
              : status;

      throw new ForbiddenException(
        `Ação não permitida. Este evento está ${statusFormatado}`,
      );
    }
  }

  // ─── CREATE ─────────────────────────────────────────────────────────────────
  async create(
    dto: CreateEscalaDto,
    usuarioLogado: { id: number; typeUser: number; omeId: number },
  ): Promise<ReturnEscalaDto> {
    // ✅ removida a chamada duplicada de verificarPermissaoOme que estava aqui

    const [{ usuario, sgp }] = await Promise.all([
      this.buscarDadosParaEscala(dto.usuarioId),
      this.verificarPermissaoOme(dto.operacaoId, usuarioLogado),
      this.verificarStatusEvento(dto.operacaoId),
    ]);

    const tipoEscala = sgp?.tipoSgp ?? 'P';
    const cota = this.calcularCota(dto.horaInicio, dto.horaFim);

    await Promise.all([
      this.verificarConflito(usuario.mat, dto.dataInicio, dto.sistema),
      this.verificarTeto(dto.operacaoId, tipoEscala, cota),
    ]);

    const escala = this.repo.create({
      sistema: dto.sistema,
      mat: usuario.mat,
      operacao: { id: dto.operacaoId },
      usuario: { id: dto.usuarioId },
      cpf_escala: sgp?.cpfSgp ?? '',
      pg_escala: sgp?.pgSgp ?? '',
      tipo_escala: tipoEscala,
      nome_escala: sgp?.nomeGuerraSgp ?? '',
      phone_escala: usuario.phone ?? '',
      nomeome_escala: usuario.ome?.nomeOme ?? '',
      banco_escala: usuario.conta?.banco ?? '',
      agencia_escala: usuario.conta?.agencia ?? '',
      conta_escala: usuario.conta?.conta ?? '',
      dataInicio: dto.dataInicio,
      horaInicio: dto.horaInicio,
      horaFim: dto.horaFim,
      cota_escala: cota,
      localApresentacao:
        dto.localApresentacao ?? sgp?.localApresentacaoSgp ?? 'SEDE DA OME',
      funcao: dto.funcao,
      situacao: dto.situacao ?? 'REGULAR',
      anotacoes: dto.anotacoes,
    });

    try {
      const saved = await this.repo.save(escala);
      return this.findOne(saved.id); // ✅ dentro do try, onde saved existe
    } catch (error: unknown) {
      // ✅ cast correto para acessar driverError sem erro de TypeScript
      const dbError = error as { driverError?: { code?: string } };
      if (dbError?.driverError?.code === '23505') {
        throw new BadRequestException(
          `Matrícula ${escala.mat} já está escalada nesta data para o sistema ${escala.sistema}`,
        );
      }
      throw error;
    }
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

    // ✅ índice [0]=permissão(void), [1]=status(void), [2]=dadosNovos
    const [, , dadosNovos] = await Promise.all([
      this.verificarPermissaoOme(operacaoId, usuarioLogado),
      this.verificarStatusEvento(operacaoId),
      dto.usuarioId
        ? this.buscarDadosParaEscala(dto.usuarioId)
        : Promise.resolve(null),
    ]);

    // ✅ usa dadosNovos do Promise.all — sem segunda chamada a buscarDadosParaEscala
    if (dadosNovos) {
      const { usuario, sgp } = dadosNovos;
      escala.mat = usuario.mat;
      escala.cpf_escala = sgp?.cpfSgp ?? '';
      escala.pg_escala = sgp?.pgSgp ?? '';
      escala.tipo_escala = sgp?.tipoSgp ?? 'P';
      escala.nome_escala = sgp?.nomeGuerraSgp ?? '';
      escala.phone_escala = usuario.phone ?? '';
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

    // ✅ conflito e teto em paralelo
    await Promise.all([
      this.verificarConflito(escala.mat, novaData, novaSistema, id),
      this.verificarTeto(operacaoId, escala.tipo_escala, novaCota, id),
    ]);

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
    mat: string,
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
    mat: string,
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

    await Promise.all([
      this.verificarPermissaoOme(escala.operacao.id, usuarioLogado),
      this.verificarStatusEvento(escala.operacao.id), // ✅ adicionar
    ]);

    await this.repo.delete(id);
  }
}
