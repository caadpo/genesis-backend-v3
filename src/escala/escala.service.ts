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
import { ViaturaEntity } from 'src/viatura/entities/viatura.entity';

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

    @InjectRepository(ViaturaEntity)
    private readonly viaturaRepo: Repository<ViaturaEntity>,
  ) {}

  // ─── Funções que permitem viatura ───────────────────────────────────────────
  private readonly FUNCOES_COM_VIATURA = ['CMT', 'MOT', 'FISCAL', 'PAT'];

  // ─── Verificação de viatura ──────────────────────────────────────────────────
  private async verificarViatura(
    viaturaId: number | null | undefined,
    funcao: string,
    omeId: number,
  ): Promise<void> {
    if (!viaturaId) return; // viatura é opcional — sem id, sem verificação

    if (!this.FUNCOES_COM_VIATURA.includes(funcao)) {
      throw new BadRequestException(
        `A função "${funcao}" não permite atribuição de viatura`,
      );
    }

    const viatura = await this.viaturaRepo.findOne({
      where: { id: viaturaId },
    });

    if (!viatura) throw new NotFoundException('Viatura não encontrada');

    if (viatura.omeId !== omeId) {
      throw new ForbiddenException('Você só pode atribuir viaturas da sua OME');
    }
  }

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

  // ─── FIND MINHAS ESCALAS (usuário logado) ────────────────────────────────────
  async findMinhasEscalas(usuarioLogado: {
    id: number;
    mat: string;
  }): Promise<ReturnEscalaDto[]> {
    const escalas = await this.repo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.viatura', 'viatura')
      .leftJoinAndSelect('e.operacao', 'operacao')
      .leftJoinAndSelect('operacao.evento', 'evento')
      .leftJoinAndSelect('evento.ome', 'ome') // ✅ garante nomeOme
      .where('e.mat = :mat', { mat: usuarioLogado.mat })
      .orderBy('e.data_inicio', 'ASC')
      .addOrderBy('e.hora_inicio', 'ASC')
      .getMany();

    return escalas.map((e) => new ReturnEscalaDto(e));
  }

  // ─── CREATE ─────────────────────────────────────────────────────────────────
  async create(
    dto: CreateEscalaDto,
    usuarioLogado: { id: number; typeUser: number; omeId: number },
  ): Promise<ReturnEscalaDto> {
    const [{ usuario, sgp }] = await Promise.all([
      this.buscarDadosParaEscala(dto.usuarioId),
      this.verificarPermissaoOme(dto.operacaoId, usuarioLogado),
      this.verificarStatusEvento(dto.operacaoId),
      // ✅ valida viatura junto com as outras verificações iniciais
      this.verificarViatura(dto.viaturaId, dto.funcao, usuarioLogado.omeId),
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
      // ✅ undefined é ignorado pelo TypeORM — sem problema
      viaturaId: dto.viaturaId ?? undefined,
    });

    try {
      const saved = await this.repo.save(escala);
      return this.findOne(saved.id);
    } catch (error: unknown) {
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

    // ✅ funcao final = a que vier no dto ou a que já estava na escala
    const funcaoFinal = dto.funcao ?? escala.funcao;

    const [, , dadosNovos] = await Promise.all([
      this.verificarPermissaoOme(operacaoId, usuarioLogado),
      this.verificarStatusEvento(operacaoId),
      dto.usuarioId
        ? this.buscarDadosParaEscala(dto.usuarioId)
        : Promise.resolve(null),
      // ✅ valida viatura no update também
      this.verificarViatura(dto.viaturaId, funcaoFinal, usuarioLogado.omeId),
    ]);

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
      // ✅ viaturaId: atualiza se veio no dto; null para remover; undefined para manter
      ...(dto.viaturaId !== undefined && { viaturaId: dto.viaturaId ?? null }),
    });

    await this.repo.save(escala);
    return this.findOne(id);
  }

  // ─── FIND BY OPERACAO ────────────────────────────────────────────────────────
  async findByOperacao(operacaoId: number): Promise<ReturnEscalaDto[]> {
    const escalas = await this.repo.find({
      where: { operacao: { id: operacaoId } },
      relations: { viatura: true }, // ✅ carrega os dados da viatura
      order: { dataInicio: 'ASC', horaInicio: 'ASC' },
    });

    return escalas.map((e) => new ReturnEscalaDto(e));
  }

  // ─── FIND ONE ────────────────────────────────────────────────────────────────
  async findOne(id: number): Promise<ReturnEscalaDto> {
    const escala = await this.repo.findOne({
      where: { id },
      relations: { viatura: true }, // ✅ carrega os dados da viatura
    });
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
