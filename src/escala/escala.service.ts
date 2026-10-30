import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';

import { OperacaoOmeCompartilhada } from 'src/operacao/entities/operacao-ome-compartilhada.entity';
import {
  CreateVagaDto,
  PreencherVagaDto,
  SubstituirUsuarioDto,
} from './dtos/vaga.dtos';

import { EscalaEntity } from './entities/escala.entity';
import { CreateEscalaDto } from './dtos/create-escala.dto';
import { UpdateEscalaDto } from './dtos/update-escala.dto';
import { ReturnEscalaDto } from './dtos/return-escala.dto';
import { UserEntity } from 'src/user/entities/user.entity';
import { Operacao } from 'src/operacao/entities/operacao.entity';
import { UserType } from 'src/user/enum/user-type.enum';
import { ViaturaEntity } from 'src/viatura/entities/viatura.entity';
import { DadosSgpEntity } from 'src/dadossgp/entities/dadossgp.entity';
import { ReturnEscalaOperacaoDto } from './dtos/return-escala-operacao.dto';

import { DataSource, In } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BulkEscalaRowDto } from './dtos/bulk-escala-row.dto';
import { lerPlanilhaEscalas } from './utils/planilha-escala.util';

import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { tmpdir } from 'os';
import { PagamentoEntity } from 'src/pagamento/entities/pagamento.entity';
import { ConfirmarPresencaDto } from './dtos/confirmar-presenca.dto';
import { ReturnColegaDto } from './dtos/return-colega.dto';
import { ReturnMinhaEscalaDto } from './dtos/return-minha-escala.dto';

const execFileAsync = promisify(execFile);

export interface CotasPorTipo {
  tipo_escala: string;
  totalCotas: number;
}

@Injectable()
export class EscalaService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,

    @InjectRepository(EscalaEntity)
    private readonly repo: Repository<EscalaEntity>,

    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,

    @InjectRepository(Operacao)
    private readonly operacaoRepo: Repository<Operacao>,

    @InjectRepository(ViaturaEntity)
    private readonly viaturaRepo: Repository<ViaturaEntity>,

    @InjectRepository(DadosSgpEntity)
    private readonly dadosSgpRepo: Repository<DadosSgpEntity>,

    @InjectRepository(PagamentoEntity)
    private readonly pagamentoRepo: Repository<PagamentoEntity>,

    @InjectRepository(OperacaoOmeCompartilhada)
    private readonly compRepo: Repository<OperacaoOmeCompartilhada>,
  ) {}

  private readonly FUNCOES_COM_VIATURA = ['CMT', 'MOT', 'FISCAL', 'PAT'];
  private readonly MINUTOS_ANTECEDENCIA_PRESENCA = 15;

  private valorMultiplicador(sistema: string, tipo_escala: string): number {
    if (sistema === 'PJES') {
      if (tipo_escala === 'O') return 300;
      if (tipo_escala === 'P') return 200;
      return 0;
    }
    if (sistema === 'DIARIAS') return 180;
    return 1;
  }

  // ── Cotas por escopo ────────────────────────────────────────────────────────

  async calcularCotasPorOperacao(operacaoId: number): Promise<CotasPorTipo[]> {
    const rows = await this.repo
      .createQueryBuilder('e')
      .select('e.tipo_escala', 'tipo_escala')
      .addSelect('COALESCE(SUM(e.cota_escala), 0)', 'totalCotas')
      .where('e.operacao_id = :operacaoId', { operacaoId })
      .groupBy('e.tipo_escala')
      .getRawMany<{ tipo_escala: string; totalCotas: string }>();

    return rows.map((r) => ({
      tipo_escala: r.tipo_escala,
      totalCotas: Number(r.totalCotas),
    }));
  }

  async calcularCotasPorEvento(eventoId: number): Promise<CotasPorTipo[]> {
    const rows = await this.repo
      .createQueryBuilder('e')
      .select('e.tipo_escala', 'tipo_escala')
      .addSelect('COALESCE(SUM(e.cota_escala), 0)', 'totalCotas')
      .innerJoin('e.operacao', 'op')
      .where('op.evento_id = :eventoId', { eventoId })
      .groupBy('e.tipo_escala')
      .getRawMany<{ tipo_escala: string; totalCotas: string }>();

    return rows.map((r) => ({
      tipo_escala: r.tipo_escala,
      totalCotas: Number(r.totalCotas),
    }));
  }

  async calcularCotasPorDistribuicao(
    distribuicaoId: number,
  ): Promise<CotasPorTipo[]> {
    const rows = await this.repo
      .createQueryBuilder('e')
      .select('e.tipo_escala', 'tipo_escala')
      .addSelect('COALESCE(SUM(e.cota_escala), 0)', 'totalCotas')
      .innerJoin('e.operacao', 'op')
      .innerJoin('op.evento', 'ev')
      .where('ev.distribuicao_id = :distribuicaoId', { distribuicaoId })
      .groupBy('e.tipo_escala')
      .getRawMany<{ tipo_escala: string; totalCotas: string }>();

    return rows.map((r) => ({
      tipo_escala: r.tipo_escala,
      totalCotas: Number(r.totalCotas),
    }));
  }

  // ── Privados ────────────────────────────────────────────────────────────────

  private async verificarViatura(
    viaturaId: number | null | undefined,
    funcao: string,
    operacaoId: number,
  ): Promise<void> {
    if (!viaturaId) return;

    if (!this.FUNCOES_COM_VIATURA.includes(funcao)) {
      throw new BadRequestException(
        `A função "${funcao}" não permite atribuição de viatura`,
      );
    }

    const [viatura, operacao, compartilhadas] = await Promise.all([
      this.viaturaRepo.findOne({ where: { id: viaturaId } }),
      this.operacaoRepo.findOne({
        where: { id: operacaoId },
        relations: { evento: { ome: true } },
      }),
      this.compRepo.find({
        where: { operacao: { id: operacaoId } },
        relations: { ome: true },
      }),
    ]);

    if (!viatura) throw new NotFoundException('Viatura não encontrada');

    const omesPermitidas = [
      operacao?.evento?.ome?.id,
      ...compartilhadas.map((c) => c.ome.id),
    ].filter((x): x is number => x != null);

    if (!omesPermitidas.includes(viatura.omeId)) {
      throw new ForbiddenException(
        'A viatura não pertence à OME do evento nem a uma OME participante',
      );
    }
  }

  private async buscarUsuario(usuarioId: number): Promise<{
    usuario: UserEntity;
    sgp: DadosSgpEntity;
  }> {
    const usuario = await this.userRepo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.conta', 'conta')
      .leftJoinAndSelect('u.ome', 'ome')
      .where('u.id = :id', { id: usuarioId })
      .getOne();

    if (!usuario) throw new NotFoundException('Usuário não encontrado');

    const sgp = await this.dadosSgpRepo.findOne({
      where: { matSgp: usuario.mat },
    });

    if (!sgp) {
      throw new BadRequestException(
        `Não foi encontrado registro em dadosSgp para a matrícula ${usuario.mat}. ` +
          `Não é possível criar escala sem vínculo com o SGP.`,
      );
    }

    return { usuario, sgp };
  }

  private async verificarPermissaoOme(
    operacaoId: number,
    usuarioLogado: { id: number; typeUser: number; omeId: number },
  ): Promise<void> {
    if (Number(usuarioLogado.typeUser) !== UserType.AUXILIAR) return;

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

  private normalizarHora(hora: string): string {
    return hora?.slice(0, 5) ?? hora;
  }

  private calcularCota(
    horaInicio: string,
    horaFim: string,
    sistema: string,
  ): number {
    if (
      sistema === 'PJES' &&
      this.normalizarHora(horaInicio) === this.normalizarHora(horaFim)
    ) {
      return 2;
    }
    return 1;
  }

  // ── Janela de tempo da escala (presença / saída) ─────────────────────────────

  private combinarDataHora(data: string, hora: string): Date {
    const [ano, mes, dia] = data.split('-').map(Number);
    const [h, m] = this.normalizarHora(hora).split(':').map(Number);
    return new Date(ano, mes - 1, dia, h, m, 0, 0);
  }

  /**
   * Calcula início, fim e abertura da janela de presença de uma escala.
   * Trata escalas noturnas (horaFim <= horaInicio → término é no dia seguinte).
   */
  private calcularJanelaEscala(
    dataInicio: string,
    horaInicio: string,
    horaFim: string,
  ): { inicio: Date; fim: Date; aberturaPresenca: Date } {
    const inicio = this.combinarDataHora(dataInicio, horaInicio);
    let fim = this.combinarDataHora(dataInicio, horaFim);

    if (fim <= inicio) {
      fim = new Date(fim.getTime() + 24 * 60 * 60 * 1000);
    }

    const aberturaPresenca = new Date(
      inicio.getTime() - this.MINUTOS_ANTECEDENCIA_PRESENCA * 60 * 1000,
    );

    return { inicio, fim, aberturaPresenca };
  }

  private async verificarConflito(
    matEscala: string,
    dataInicio: string,
    sistema: string,
    excludeId?: number,
  ): Promise<void> {
    const qb = this.repo
      .createQueryBuilder('e')
      .where('e.mat_escala = :matEscala', { matEscala })
      .andWhere('e.data_inicio = :dataInicio', { dataInicio })
      .andWhere('e.sistema = :sistema', { sistema });

    if (excludeId) qb.andWhere('e.id != :excludeId', { excludeId });

    const existe = await qb.getExists();
    if (existe) {
      throw new BadRequestException(
        `Matrícula ${matEscala} já está escalada em ${dataInicio} para o sistema ${sistema}`,
      );
    }
  }

  private async verificarTeto(
    operacaoId: number,
    tipoEscala: string,
    novaCota: number,
    excludeId?: number,
  ): Promise<void> {
    const [operacao, somaResult] = await Promise.all([
      this.operacaoRepo.findOneBy({ id: operacaoId }),

      (() => {
        const qb = this.repo
          .createQueryBuilder('e')
          .select('COALESCE(SUM(e.cota_escala), 0)', 'soma')
          .where('e.operacao_id = :operacaoId', { operacaoId })
          .andWhere('e.tipo_escala = :tipoEscala', { tipoEscala });

        if (excludeId) qb.andWhere('e.id != :excludeId', { excludeId });

        return qb.getRawOne<{ soma: string }>();
      })(),
    ]);

    if (!operacao) throw new NotFoundException('Operação não encontrada');

    const somaAtual = Number(somaResult?.soma ?? 0);

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

  private async verificarLimiteCotasUsuario(
    matEscala: string,
    sistema: string,
    operacaoId: number,
    novaCota: number,
    excludeId?: number,
  ): Promise<void> {
    const LIMITE_PJES = 12;
    const LIMITE_DIARIAS = 30;

    let somaAtual = 0;

    if (sistema === 'PJES') {
      const qb = this.repo
        .createQueryBuilder('e')
        .select('COALESCE(SUM(e.cota_escala), 0)', 'soma')
        .where('e.mat_escala = :mat', { mat: matEscala })
        .andWhere('e.sistema = :sistema', { sistema })
        .andWhere(
          `EXTRACT(MONTH FROM e.data_inicio) = (
          SELECT EXTRACT(MONTH FROM e2.data_inicio)
          FROM escala e2
          INNER JOIN operacao op2 ON op2.id = e2.operacao_id
          WHERE op2.id = :operacaoId
          LIMIT 1
        )`,
          { operacaoId },
        )
        .andWhere(
          `EXTRACT(YEAR FROM e.data_inicio) = (
          SELECT EXTRACT(YEAR FROM e2.data_inicio)
          FROM escala e2
          INNER JOIN operacao op2 ON op2.id = e2.operacao_id
          WHERE op2.id = :operacaoId
          LIMIT 1
        )`,
          { operacaoId },
        );

      if (excludeId) qb.andWhere('e.id != :excludeId', { excludeId });

      const result = await qb.getRawOne<{ soma: string }>();
      somaAtual = Number(result?.soma ?? 0);

      if (somaAtual + novaCota > LIMITE_PJES) {
        throw new BadRequestException(
          `Usuário já está com ${somaAtual} cotas para o sistema PJES neste mês. Limite: ${LIMITE_PJES}`,
        );
      }
    }

    if (sistema === 'DIARIAS') {
      const qb = this.repo
        .createQueryBuilder('e')
        .select('COALESCE(SUM(e.cota_escala), 0)', 'soma')
        .where('e.mat_escala = :mat', { mat: matEscala })
        .andWhere('e.sistema = :sistema', { sistema })
        .andWhere('e.operacao_id = :operacaoId', { operacaoId });

      if (excludeId) qb.andWhere('e.id != :excludeId', { excludeId });

      const result = await qb.getRawOne<{ soma: string }>();
      somaAtual = Number(result?.soma ?? 0);

      if (somaAtual + novaCota > LIMITE_DIARIAS) {
        throw new BadRequestException(
          `Usuário já está com ${somaAtual} cotas para o sistema DIARIAS nesta operação. Limite: ${LIMITE_DIARIAS}`,
        );
      }
    }
  }

  /**
   * Confirma se o usuário logado tem tipoSgp = 'O' (Oficial) pelo registro
   * dadosSgp vinculado à sua matrícula. Substitui a antiga regra de
   * "precisa estar escalado como FISCAL nesta operação/data".
   */
  private async eUsuarioTipoOficial(usuarioId: number): Promise<boolean> {
    const usuario = await this.userRepo.findOne({ where: { id: usuarioId } });
    if (!usuario) return false;

    const sgp = await this.dadosSgpRepo.findOne({
      where: { matSgp: usuario.mat },
    });

    return sgp?.tipoSgp === 'O';
  }

  // ── Find minhas escalas ─────────────────────────────────────────────────────

  // ── Find minhas escalas (agora com filtro opcional por mês) ─────────────────

  async findMinhasEscalas(
    usuarioLogado: { id: number; mat: string },
    mes?: number,
    ano?: number,
  ): Promise<ReturnMinhaEscalaDto[]> {
    const qb = this.repo
      .createQueryBuilder('e')
      // Só as colunas que a tela usa (sem cpf, nome completo, conta etc.)
      .select([
        'e.id',
        'e.sistema',
        'e.tipo_escala',
        'e.dataInicio',
        'e.horaInicio',
        'e.horaFim',
        'e.cota_escala',
        'e.localApresentacao',
        'e.funcao',
        'e.situacao',
        'e.anotacoes',
        'e.presencaConfirmada',
        'e.presencaConfirmadaEm',
        'e.presencaLatitude',
        'e.presencaLongitude',
        'e.saidaConfirmada',
        'e.saidaConfirmadaEm',
        'e.saidaConfirmadaPorId',
        'e.primeiraVerificacao',
        'e.dataHoraVerificador1',
        'e.obsVerificador1',
        'e.segundaVerificacao',
        'e.dataHoraVerificador2',
        'e.obsVerificador2',
      ])
      .leftJoin('e.operacao', 'operacao')
      .leftJoin('operacao.evento', 'evento')
      .leftJoin('evento.ome', 'ome')
      .leftJoin('evento.distribuicao', 'distribuicao')
      .leftJoin('distribuicao.teto', 'teto')
      // verificadores: só id e matrícula (para resolver "PG MAT NOME")
      .leftJoin('e.verificador1', 'verificador1')
      .leftJoin('e.verificador2', 'verificador2')
      .addSelect([
        'operacao.id',
        'operacao.nome_operacao',
        'operacao.cod_op',
        'evento.id',
        'evento.nome_evento',
        'evento.status_evento',
        'evento.updated_at',
        'ome.id',
        'ome.nomeOme',
        'distribuicao.id',
        'teto.id',
        'teto.status',
        'verificador1.id',
        'verificador1.mat',
        'verificador2.id',
        'verificador2.mat',
      ])
      .where('e.usuario_id = :usuarioId', { usuarioId: usuarioLogado.id });

    // Intervalo [inicio, fim): usa índice (sem EXTRACT na coluna)
    if (mes && ano) {
      const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
      const proxMes = mes === 12 ? 1 : mes + 1;
      const proxAno = mes === 12 ? ano + 1 : ano;
      const fim = `${proxAno}-${String(proxMes).padStart(2, '0')}-01`;

      qb.andWhere('e.data_inicio >= :inicio AND e.data_inicio < :fim', {
        inicio,
        fim,
      });
    }

    const escalas = await qb
      .orderBy('e.data_inicio', 'ASC')
      .addOrderBy('e.hora_inicio', 'ASC')
      .getMany();

    if (escalas.length === 0) return [];

    const eventoIds = [
      ...new Set(
        escalas
          .map((e) => e.operacao?.evento?.id)
          .filter((id): id is number => id != null),
      ),
    ];

    // Independentes → em paralelo. O mapa de nomes só consulta o SGP se
    // existir algum verificador nas escalas do mês.
    const [sgpMap, pagamentosUsuario] = await Promise.all([
      this.construirMapaNomes(escalas),
      eventoIds.length
        ? this.pagamentoRepo.find({
            where: { usuarioId: usuarioLogado.id, eventoId: In(eventoIds) },
            select: { eventoId: true, comentario_pagamento: true },
          })
        : Promise.resolve([] as PagamentoEntity[]),
    ]);

    const comentarioPorEvento = new Map<number, string | null>();
    for (const pg of pagamentosUsuario) {
      comentarioPorEvento.set(pg.eventoId, pg.comentario_pagamento ?? null);
    }

    return escalas.map((e) => {
      const evento = e.operacao?.evento;

      let pagamento = '';
      if (e.sistema === 'PJES') {
        const statusTeto = evento?.distribuicao?.teto?.status;
        if (statusTeto === 'ABERTO') pagamento = 'Pendente';
        else if (statusTeto === 'ENCERRADO') pagamento = 'Pago';
      } else if (e.sistema === 'DIARIAS' && evento?.status_evento) {
        pagamento = `${evento.status_evento}${
          evento.updated_at
            ? ' - ' + new Date(evento.updated_at).toLocaleString('pt-BR')
            : ''
        }`;
      }

      return new ReturnMinhaEscalaDto(e, this.resolverNomes(e, sgpMap), {
        valorIndividual:
          (e.cota_escala || 0) *
          this.valorMultiplicador(e.sistema, e.tipo_escala),
        pagamento,
        comentario_pagamento: evento?.id
          ? (comentarioPorEvento.get(evento.id) ?? null)
          : null,
      });
    });
  }

  // ── Colegas do mesmo serviço (consulta enxuta, filtrada no SQL) ──────────────

  async findColegas(
    escalaId: number,
    usuarioLogado: { id: number },
  ): Promise<ReturnColegaDto[]> {
    // 1) Carrega só o mínimo da escala "âncora"
    const minha = await this.repo.findOne({
      where: { id: escalaId },
      relations: { usuario: true, operacao: true },
      select: {
        id: true,
        dataInicio: true,
        horaInicio: true,
        horaFim: true,
        viaturaId: true,
        mat_escala: true,
        usuario: { id: true },
        operacao: { id: true },
      },
    });

    if (!minha) throw new NotFoundException('Escala não encontrada');

    // Só o próprio escalado enxerga os colegas dessa escala
    if (minha.usuario?.id !== usuarioLogado.id) {
      throw new ForbiddenException('Você só pode consultar as suas escalas');
    }

    if (!minha.operacao?.id || !minha.mat_escala) return [];

    // 2) Filtro inteiro no banco: sem joins, só colunas necessárias
    const qb = this.repo
      .createQueryBuilder('e')
      .leftJoin('e.usuario', 'u') // só para trazer o telefone
      .select([
        'e.id',
        'e.pg_escala',
        'e.mat_escala',
        'e.ng_escala',
        'e.tipo_escala',
        'e.funcao',
        'e.viaturaId',
        'u.id',
        'u.phone',
      ])
      .where('e.operacao_id = :operacaoId', { operacaoId: minha.operacao.id })
      .andWhere('e.dataInicio = :dataInicio', { dataInicio: minha.dataInicio })
      .andWhere('e.horaInicio = :horaInicio', { horaInicio: minha.horaInicio })
      .andWhere('e.horaFim = :horaFim', { horaFim: minha.horaFim })
      .andWhere('e.mat_escala IS NOT NULL')
      .andWhere('e.mat_escala != :mat', { mat: minha.mat_escala })
      .andWhere('e.isVagaAberta = false');

    // Mesmo comportamento anterior: se eu tenho viatura, só quem está na mesma
    if (minha.viaturaId) {
      qb.andWhere('e.viaturaId = :viaturaId', { viaturaId: minha.viaturaId });
    }

    const colegas = await qb
      .orderBy('e.funcao', 'ASC')
      .addOrderBy('e.ng_escala', 'ASC')
      .limit(50)
      .getMany();

    return colegas.map((c) => new ReturnColegaDto(c));
  }

  // ── Home: próximas escalas com membros do serviço ───────────────────────────

  async findProximas(usuarioLogado: { id: number }, hoje?: string, limite = 2) {
    const dataCorte =
      hoje ??
      (() => {
        const d = new Date();
        const p = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
      })();

    const [total, escalas] = await Promise.all([
      this.repo
        .createQueryBuilder('e')
        .where('e.usuario_id = :id', { id: usuarioLogado.id })
        .andWhere('e.data_inicio >= :dataCorte', { dataCorte })
        .getCount(),

      this.repo
        .createQueryBuilder('e')
        .leftJoin('e.viatura', 'viatura')
        .leftJoin('e.operacao', 'operacao')
        .leftJoin('operacao.evento', 'evento')
        .leftJoin('evento.ome', 'ome')
        .select([
          'e.id',
          'e.sistema',
          'e.dataInicio',
          'e.horaInicio',
          'e.horaFim',
          'e.localApresentacao',
          'e.funcao',
          'e.viaturaId',
        ])
        .addSelect([
          'viatura.id',
          'viatura.patrimonio',
          'operacao.id',
          'evento.id',
          'evento.nome_evento',
          'ome.id',
          'ome.nomeOme',
        ])
        .where('e.usuario_id = :id', { id: usuarioLogado.id })
        .andWhere('e.data_inicio >= :dataCorte', { dataCorte })
        .orderBy('e.data_inicio', 'ASC')
        .addOrderBy('e.hora_inicio', 'ASC')
        .limit(limite) // só joins to-one, então limit é seguro
        .getMany(),
    ]);

    if (escalas.length === 0) return { total, escalas: [] };

    // Todos os membros dos serviços acima, em UMA query
    const operacaoIds = [
      ...new Set(
        escalas.map((e) => e.operacao?.id).filter((id): id is number => !!id),
      ),
    ];
    const datas = [...new Set(escalas.map((e) => e.dataInicio))];

    const candidatos = operacaoIds.length
      ? await this.repo
          .createQueryBuilder('e')
          .leftJoin('e.operacao', 'operacao')
          .select([
            'e.id',
            'e.mat_escala',
            'e.ng_escala',
            'e.dataInicio',
            'e.horaInicio',
            'e.horaFim',
            'e.viaturaId',
          ])
          .addSelect('operacao.id')
          .where('e.operacao_id IN (:...operacaoIds)', { operacaoIds })
          .andWhere('e.data_inicio IN (:...datas)', { datas })
          .andWhere('e.is_vaga_aberta = false')
          .andWhere('e.mat_escala IS NOT NULL')
          .getMany()
      : [];

    const chave = (
      operacaoId: number | undefined,
      e: {
        dataInicio: string;
        horaInicio: string;
        horaFim: string;
        viaturaId?: number | null;
      },
    ) =>
      `${operacaoId}|${e.dataInicio}|${e.horaInicio}|${e.horaFim}|${e.viaturaId ?? ''}`;

    const gruposMembros = new Map<string, typeof candidatos>();
    for (const c of candidatos) {
      const k = chave(c.operacao?.id, c);
      if (!gruposMembros.has(k)) gruposMembros.set(k, []);
      gruposMembros.get(k)!.push(c);
    }

    return {
      total,
      escalas: escalas.map((e) => ({
        id: e.id,
        sistema: e.sistema,
        dataInicio: e.dataInicio,
        horaInicio: e.horaInicio,
        horaFim: e.horaFim,
        localApresentacao: e.localApresentacao,
        funcao: e.funcao,
        nomeEvento: e.operacao?.evento?.nome_evento ?? null,
        nomeOme: e.operacao?.evento?.ome?.nomeOme ?? null,
        viatura: e.viatura ? { patrimonio: e.viatura.patrimonio } : null,
        membros: (gruposMembros.get(chave(e.operacao?.id, e)) ?? []).map(
          (m) => ({
            id: m.id,
            mat_escala: m.mat_escala,
            ng_escala: m.ng_escala,
          }),
        ),
      })),
    };
  }

  async findEscalasByUsuario(
    usuarioId: number,
    sistema: string,
    usuarioLogado: { id: number; typeUser: number; omeId: number },
  ): Promise<ReturnEscalaDto[]> {
    const logadoType = Number(usuarioLogado.typeUser);
    const isMasterOuTecnico =
      logadoType === UserType.MASTER || logadoType === UserType.TECNICO;
    const isAuxiliar = logadoType === UserType.AUXILIAR;

    if (!isMasterOuTecnico && !isAuxiliar) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar essa área',
      );
    }

    if (isAuxiliar) {
      const alvo = await this.userRepo.findOne({ where: { id: usuarioId } });
      if (!alvo) throw new NotFoundException('Usuário não encontrado');

      if (Number(alvo.omeId) !== Number(usuarioLogado.omeId)) {
        throw new ForbiddenException(
          'Auxiliar só pode visualizar a escala de usuários da sua OME',
        );
      }

      if (Number(alvo.omeId) === 1) {
        throw new ForbiddenException(
          'Auxiliar não pode visualizar a escala de usuários da OME DPO SEDE',
        );
      }

      const tiposProibidos = [
        UserType.MASTER,
        UserType.TECNICO,
        UserType.DIRETOR,
      ];
      if (tiposProibidos.includes(Number(alvo.typeUser))) {
        throw new ForbiddenException(
          'Você não tem permissão para visualizar a escala deste usuário',
        );
      }
    }

    const escalas = await this.repo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.viatura', 'viatura')
      .leftJoinAndSelect('e.operacao', 'operacao')
      .leftJoinAndSelect('operacao.evento', 'evento')
      .leftJoinAndSelect('evento.ome', 'ome')
      .leftJoinAndSelect('e.conta', 'conta')
      .leftJoinAndSelect('e.presencaConfirmadaPor', 'confirmador')
      .leftJoinAndSelect('e.saidaConfirmadaPor', 'saidaPor')
      .where('e.usuario_id = :usuarioId', { usuarioId })
      .andWhere('e.sistema = :sistema', { sistema })
      .orderBy('e.data_inicio', 'ASC')
      .addOrderBy('e.hora_inicio', 'ASC')
      .getMany();

    const sgpMap = await this.construirMapaNomes(escalas);

    return escalas.map(
      (e) => new ReturnEscalaDto(e, this.resolverNomes(e, sgpMap)),
    );
  }

  // ── Create ──────────────────────────────────────────────────────────────────

  async create(
    dto: CreateEscalaDto,
    usuarioLogado: { id: number; typeUser: number; omeId: number },
  ): Promise<ReturnEscalaDto> {
    const [{ usuario, sgp }] = await Promise.all([
      this.buscarUsuario(dto.usuarioId),
      this.verificarPermissaoOme(dto.operacaoId, usuarioLogado),
      this.verificarStatusEvento(dto.operacaoId),
      this.verificarViatura(dto.viaturaId, dto.funcao, dto.operacaoId),
    ]);

    const cota = this.calcularCota(dto.horaInicio, dto.horaFim, dto.sistema);

    await Promise.all([
      this.verificarConflito(sgp.matSgp, dto.dataInicio, dto.sistema),
      this.verificarTeto(dto.operacaoId, sgp.tipoSgp, cota),
      this.verificarLimiteCotasUsuario(
        sgp.matSgp,
        dto.sistema,
        dto.operacaoId,
        cota,
      ),
    ]);

    const escala = this.repo.create({
      sistema: dto.sistema,
      operacao: { id: dto.operacaoId },
      usuario: { id: dto.usuarioId },

      pg_escala: sgp.pgSgp,
      mat_escala: sgp.matSgp,
      ng_escala: sgp.nomeGuerraSgp,
      tipo_escala: sgp.tipoSgp,
      cpf_escala: sgp.cpfSgp,
      nomecompleto_escala: sgp.nomeCompletoSgp,
      nomeome_escala: usuario.ome?.nomeOme ?? '',
      nunfunc_escala: sgp.nunfuncSgp,
      nunvinc_escala: sgp.nunvincSgp,

      conta: usuario.conta ?? undefined,
      dataInicio: dto.dataInicio,
      horaInicio: dto.horaInicio,
      horaFim: dto.horaFim,
      cota_escala: cota,
      localApresentacao:
        dto.localApresentacao ?? sgp.localApresentacaoSgp ?? 'SEDE DA OME',
      funcao: dto.funcao,
      situacao: dto.situacao ?? 'REGULAR',
      anotacoes: dto.anotacoes,
      viaturaId: dto.viaturaId ?? undefined,
    });

    try {
      const saved = await this.repo.save(escala);
      return this.findOne(saved.id);
    } catch (error: unknown) {
      const dbError = error as { driverError?: { code?: string } };
      if (dbError?.driverError?.code === '23505') {
        throw new BadRequestException(
          `Matrícula ${sgp.matSgp} já está escalada em ${dto.dataInicio} para ${dto.sistema}`,
        );
      }
      throw error;
    }
  }

  // ── Update ──────────────────────────────────────────────────────────────────

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

    const ehVaga = escala.isVagaAberta;

    if (ehVaga && dto.usuarioId !== undefined) {
      throw new BadRequestException(
        'Para preencher uma vaga em aberto use o endpoint de preenchimento',
      );
    }
    if (ehVaga && dto.viaturaId) {
      throw new BadRequestException(
        'Vaga em aberto não aceita viatura; ela é definida ao preencher',
      );
    }

    const operacaoId = dto.operacaoId ?? escala.operacao.id;
    const funcaoFinal = dto.funcao ?? escala.funcao;

    const [, , novoUsuario] = await Promise.all([
      this.verificarPermissaoOme(operacaoId, usuarioLogado),
      this.verificarStatusEvento(operacaoId),
      dto.usuarioId ? this.buscarUsuario(dto.usuarioId) : Promise.resolve(null),
      this.verificarViatura(dto.viaturaId, funcaoFinal, operacaoId),
    ]);

    if (novoUsuario) {
      const { usuario, sgp } = novoUsuario;
      escala.usuario = { id: dto.usuarioId } as UserEntity;
      escala.conta = usuario.conta ?? null;
      escala.nomeome_escala = usuario.ome?.nomeOme ?? escala.nomeome_escala;
      escala.pg_escala = sgp.pgSgp;
      escala.mat_escala = sgp.matSgp;
      escala.ng_escala = sgp.nomeGuerraSgp;
      escala.tipo_escala = sgp.tipoSgp;
      escala.cpf_escala = sgp.cpfSgp;
      escala.nomecompleto_escala = sgp.nomeCompletoSgp;
      escala.nunfunc_escala = sgp.nunfuncSgp;
      escala.nunvinc_escala = sgp.nunvincSgp;
    }

    const novaMatEscala = escala.mat_escala;
    const novaData = dto.dataInicio ?? escala.dataInicio;
    const novaSistema = dto.sistema ?? escala.sistema;
    const novaHoraInicio = dto.horaInicio ?? escala.horaInicio;
    const novaHoraFim = dto.horaFim ?? escala.horaFim;
    const novaTipo = escala.tipo_escala;
    const novaCota = this.calcularCota(
      novaHoraInicio,
      novaHoraFim,
      novaSistema,
    );

    await Promise.all([
      novaMatEscala
        ? this.verificarConflito(novaMatEscala, novaData, novaSistema, id)
        : Promise.resolve(),
      this.verificarTeto(operacaoId, novaTipo, novaCota, id),
      novaMatEscala
        ? this.verificarLimiteCotasUsuario(
            novaMatEscala,
            novaSistema,
            operacaoId,
            novaCota,
            id,
          )
        : Promise.resolve(),
    ]);

    // Detecta mudanças que invalidam um repasse ABERTO desta escala
    const trocouMilitar = !!novoUsuario;
    const mudouServico =
      (dto.dataInicio && dto.dataInicio !== escala.dataInicio) ||
      (dto.horaInicio && dto.horaInicio !== escala.horaInicio) ||
      (dto.horaFim && dto.horaFim !== escala.horaFim) ||
      (dto.sistema && dto.sistema !== escala.sistema);
    const invalidaRepasse = trocouMilitar || !!mudouServico;

    Object.assign(escala, {
      ...(dto.sistema && { sistema: dto.sistema }),
      ...(dto.operacaoId && { operacao: { id: dto.operacaoId } }),
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
      ...(dto.viaturaId !== undefined && { viaturaId: dto.viaturaId ?? null }),

      // Qualquer edição na escala invalida o que já foi registrado nela.
      presencaConfirmada: false,
      presencaConfirmadaEm: null,
      presencaConfirmadaPorId: null,
      presencaLatitude: null,
      presencaLongitude: null,

      saidaConfirmada: false,
      saidaConfirmadaEm: null,
      saidaConfirmadaPorId: null,
      saidaAutomatica: false,

      primeiraVerificacao: false,
      idVerificador1: null,
      dataHoraVerificador1: null,
      obsVerificador1: null,

      segundaVerificacao: false,
      idVerificador2: null,
      dataHoraVerificador2: null,
      obsVerificador2: null,
    });

    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.save(escala);

        if (invalidaRepasse) {
          // O repasse ABERTO era do militar anterior / do serviço antigo
          await manager.query(
            `UPDATE "repasse" SET "status_repasse" = 'CANCELADO', "updated_at" = NOW()
             WHERE "escala_id" = $1 AND "status_repasse" = 'ABERTO'`,
            [id],
          );
        }
      });
    } catch (error: unknown) {
      const dbError = error as { driverError?: { code?: string } };
      if (dbError?.driverError?.code === '23505') {
        throw new BadRequestException(
          `Matrícula ${novaMatEscala} já está escalada em ${novaData} para ${novaSistema}`,
        );
      }
      throw error;
    }

    return this.findOne(id);
  }

  // ── Find by operacao ────────────────────────────────────────────────────────

  async findByOperacao(
    operacaoId: number,
    incluirVagas = true,
  ): Promise<ReturnEscalaOperacaoDto> {
    const qb = this.repo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.viatura', 'viatura')
      .leftJoinAndSelect('e.usuario', 'usuario')
      .leftJoinAndSelect('e.conta', 'conta')
      .leftJoinAndSelect('e.omeDestino', 'omeDestino')
      .leftJoinAndSelect('e.operacao', 'operacao')
      .leftJoinAndSelect('operacao.evento', 'evento')
      .leftJoinAndSelect('e.presencaConfirmadaPor', 'confirmador')
      .leftJoinAndSelect('e.saidaConfirmadaPor', 'saidaPor')
      .leftJoinAndSelect('e.verificador1', 'verificador1')
      .leftJoinAndSelect('e.verificador2', 'verificador2')
      .where('e.operacao_id = :operacaoId', { operacaoId })
      .orderBy('e.data_inicio', 'DESC')
      .addOrderBy('e.hora_inicio', 'ASC')
      .addOrderBy(
        `
    CASE e.funcao
      WHEN 'FISCAL' THEN 1
      WHEN 'MOT'    THEN 2
      WHEN 'PAT'    THEN 3
      WHEN 'CMT'    THEN 4
      WHEN 'POG'    THEN 5
      WHEN 'AUX'    THEN 6
      ELSE               7
    END
    `,
      );

    if (!incluirVagas) qb.andWhere('e.is_vaga_aberta = false');

    const escalas = await qb.getMany();

    const sgpMap = await this.construirMapaNomes(escalas);

    const dtos = escalas.map(
      (e) => new ReturnEscalaDto(e, this.resolverNomes(e, sgpMap)),
    );

    return new ReturnEscalaOperacaoDto(dtos);
  }

  async findByCodOp(
    codOp: string,
    usuarioLogado?: { id: number },
  ): Promise<
    (ReturnEscalaDto & {
      minhaVerificacao: 1 | 2 | null;
      podeVerificar: boolean;
    })[]
  > {
    const escalas = await this.repo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.viatura', 'viatura')
      .leftJoinAndSelect('e.usuario', 'usuario')
      .leftJoinAndSelect('e.conta', 'conta')
      .leftJoinAndSelect('e.operacao', 'operacao')
      .leftJoinAndSelect('operacao.evento', 'evento')
      .leftJoinAndSelect('evento.ome', 'ome')
      .leftJoinAndSelect('e.presencaConfirmadaPor', 'confirmador')
      .leftJoinAndSelect('e.saidaConfirmadaPor', 'saidaPor')
      .leftJoinAndSelect('e.verificador1', 'verificador1')
      .leftJoinAndSelect('e.verificador2', 'verificador2')
      .leftJoinAndSelect('e.omeDestino', 'omeDestino')
      .where('operacao.cod_op = :codOp', { codOp })
      .andWhere('e.is_vaga_aberta = false')
      .orderBy('e.data_inicio', 'ASC')
      .addOrderBy('e.hora_inicio', 'ASC')
      .addOrderBy(
        `
      CASE e.funcao
        WHEN 'FISCAL' THEN 1
        WHEN 'CMT'    THEN 2
        WHEN 'MOT'    THEN 3
        WHEN 'PAT'    THEN 4
        ELSE               5
      END
      `,
      )
      .getMany();

    if (!escalas.length) {
      throw new NotFoundException('Nenhuma escala encontrada para este COP');
    }

    const sgpMap = await this.construirMapaNomes(escalas);

    // Regra atual: qualquer usuário com tipoSgp = 'O' (Oficial) pode
    // registrar verificação — não depende mais de estar escalado como
    // FISCAL nesta operação/data.
    const usuarioEhOficial = usuarioLogado
      ? await this.eUsuarioTipoOficial(usuarioLogado.id)
      : false;

    const minhaVerificacao = (e: EscalaEntity): 1 | 2 | null => {
      if (!usuarioLogado) return null;
      if (e.idVerificador1 === usuarioLogado.id) return 1;
      if (e.idVerificador2 === usuarioLogado.id) return 2;
      return null;
    };

    return escalas.map((e) => ({
      ...new ReturnEscalaDto(e, this.resolverNomes(e, sgpMap)),
      minhaVerificacao: minhaVerificacao(e),
      podeVerificar: usuarioEhOficial,
    }));
  }

  async generatePdf(
    operacaoId: number,
    matUsuario: string,
  ): Promise<{ buffer: Buffer; cod_op: string }> {
    const [dto, operacao] = await Promise.all([
      this.findByOperacao(operacaoId, false),
      this.operacaoRepo.findOneBy({ id: operacaoId }),
    ]);

    const payload = JSON.stringify({ ...dto, operacaoId });

    const SCRIPT_PATH = path.resolve(
      process.cwd(),
      'src',
      'escala',
      'scripts',
      'generate_escala_pdf.py',
    );

    const cod_op = operacao?.cod_op ?? `op${operacaoId}`;
    const outputPath = path.join(tmpdir(), `COP_${cod_op}.pdf`);

    const inputPath = path.join(
      tmpdir(),
      `COP_${cod_op}_input_${Date.now()}.json`,
    );

    try {
      fs.writeFileSync(inputPath, payload, 'utf-8');

      await execFileAsync('python3', [
        SCRIPT_PATH,
        inputPath,
        matUsuario,
        outputPath,
      ]);

      const buffer = fs.readFileSync(outputPath);
      return { buffer, cod_op };
    } finally {
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    }
  }

  // ── Confirmação de presença (só o próprio escalado, dentro da janela) ───────

  async confirmarPresenca(
    escalaId: number,
    dto: ConfirmarPresencaDto,
    usuarioLogado: { id: number },
  ): Promise<ReturnEscalaDto> {
    const escala = await this.repo.findOne({
      where: { id: escalaId },
      relations: { usuario: true },
    });

    if (!escala) throw new NotFoundException('Escala não encontrada');

    if (!escala.usuario) {
      throw new BadRequestException(
        'Esta escala é uma vaga em aberto e ainda não foi preenchida',
      );
    }

    if (escala.usuario.id !== usuarioLogado.id) {
      throw new ForbiddenException('Você só pode confirmar a própria presença');
    }

    if (escala.presencaConfirmada) {
      throw new BadRequestException('Presença já confirmada para esta escala');
    }

    const { aberturaPresenca, fim } = this.calcularJanelaEscala(
      escala.dataInicio,
      escala.horaInicio,
      escala.horaFim,
    );

    const agora = new Date();

    if (agora < aberturaPresenca) {
      throw new ForbiddenException(
        `A confirmação de presença só é liberada a partir de ${aberturaPresenca.toLocaleString('pt-BR')} ` +
          `(${this.MINUTOS_ANTECEDENCIA_PRESENCA} minutos antes do início da escala)`,
      );
    }

    if (agora > fim) {
      throw new ForbiddenException(
        'O horário de término da escala já passou. Não é mais possível confirmar presença.',
      );
    }

    escala.presencaConfirmada = true;
    escala.presencaConfirmadaEm = agora;
    escala.presencaConfirmadaPorId = usuarioLogado.id;
    escala.presencaLatitude = dto.latitude;
    escala.presencaLongitude = dto.longitude;

    await this.repo.save(escala);
    return this.findOne(escalaId);
  }

  // ── Confirmação de saída (liberada após presença confirmada) ─────────────────

  async confirmarSaida(
    escalaId: number,
    usuarioLogado: { id: number },
  ): Promise<ReturnEscalaDto> {
    const escala = await this.repo.findOne({
      where: { id: escalaId },
      relations: { usuario: true },
    });

    if (!escala) throw new NotFoundException('Escala não encontrada');

    if (!escala.usuario) {
      throw new BadRequestException(
        'Esta escala é uma vaga em aberto e ainda não foi preenchida',
      );
    }

    if (escala.usuario.id !== usuarioLogado.id) {
      throw new ForbiddenException('Você só pode confirmar a própria saída');
    }

    if (!escala.presencaConfirmada) {
      throw new BadRequestException(
        'Não é possível registrar saída sem presença confirmada',
      );
    }

    if (escala.saidaConfirmada) {
      throw new BadRequestException('Saída já registrada para esta escala');
    }

    escala.saidaConfirmada = true;
    escala.saidaConfirmadaEm = new Date();
    escala.saidaConfirmadaPorId = usuarioLogado.id;

    await this.repo.save(escala);
    return this.findOne(escalaId);
  }

  /**
   * Fecha automaticamente a saída de quem teve presença confirmada mas não
   * deu saída até o fim do próprio turno. saidaConfirmadaPorId fica null
   * para indicar fechamento pelo sistema (não pela pessoa).
   * Requer @nestjs/schedule com ScheduleModule.forRoot() no AppModule.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async encerrarSaidasAutomaticamente(): Promise<void> {
    const pendentes = await this.repo.find({
      where: { presencaConfirmada: true, saidaConfirmada: false },
    });

    const agora = new Date();

    for (const escala of pendentes) {
      const { fim } = this.calcularJanelaEscala(
        escala.dataInicio,
        escala.horaInicio,
        escala.horaFim,
      );

      if (agora >= fim) {
        escala.saidaConfirmada = true;
        escala.saidaConfirmadaEm = fim;
        escala.saidaConfirmadaPorId = null;
        await this.repo.save(escala);
      }
    }
  }

  // ── Verificação por fiscais (1ª e 2ª ronda) ──────────────────────────────────

  async registrarVerificacao(
    escalaId: number,
    numero: 1 | 2,
    dados: { verificado?: boolean; observacao?: string },
    usuarioLogado: { id: number },
  ): Promise<ReturnEscalaDto> {
    const escala = await this.repo.findOne({
      where: { id: escalaId },
      relations: { operacao: true },
    });

    if (!escala) throw new NotFoundException('Escala não encontrada');

    if (escala.isVagaAberta) {
      throw new BadRequestException(
        'Não é possível registrar verificação em uma vaga em aberto',
      );
    }

    if (dados.verificado === undefined && dados.observacao === undefined) {
      throw new BadRequestException(
        'Informe ao menos "verificado" ou "observacao"',
      );
    }

    const ehOficial = await this.eUsuarioTipoOficial(usuarioLogado.id);
    if (!ehOficial) {
      throw new ForbiddenException(
        'Somente usuários com tipo Oficial (O) podem realizar a verificação',
      );
    }

    const idAtual =
      numero === 1 ? escala.idVerificador1 : escala.idVerificador2;

    if (idAtual != null && idAtual !== usuarioLogado.id) {
      throw new ForbiddenException(
        `A ${numero}ª verificação já foi registrada por outro fiscal`,
      );
    }

    const agora = new Date();

    if (numero === 1) {
      if (dados.verificado !== undefined) {
        escala.primeiraVerificacao = dados.verificado;
      }
      if (dados.observacao !== undefined) {
        escala.obsVerificador1 = dados.observacao;
      }
      escala.idVerificador1 = usuarioLogado.id;
      escala.dataHoraVerificador1 = agora;
    } else {
      if (dados.verificado !== undefined) {
        escala.segundaVerificacao = dados.verificado;
      }
      if (dados.observacao !== undefined) {
        escala.obsVerificador2 = dados.observacao;
      }
      escala.idVerificador2 = usuarioLogado.id;
      escala.dataHoraVerificador2 = agora;
    }

    await this.repo.save(escala);
    return this.findOne(escalaId);
  }

  // ── Find one ────────────────────────────────────────────────────────────────

  async findOne(id: number): Promise<ReturnEscalaDto> {
    const escala = await this.repo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.viatura', 'viatura')
      .leftJoinAndSelect('e.usuario', 'usuario')
      .leftJoinAndSelect('e.conta', 'conta')
      .leftJoinAndSelect('e.presencaConfirmadaPor', 'confirmador')
      .leftJoinAndSelect('e.saidaConfirmadaPor', 'saidaPor')
      .leftJoinAndSelect('e.verificador1', 'verificador1')
      .leftJoinAndSelect('e.verificador2', 'verificador2')
      .leftJoinAndSelect('e.omeDestino', 'omeDestino')
      .where('e.id = :id', { id })
      .getOne();

    if (!escala) throw new NotFoundException('Escala não encontrada');

    const sgpMap = await this.construirMapaNomes([escala]);

    return new ReturnEscalaDto(escala, this.resolverNomes(escala, sgpMap));
  }

  /**
   * Monta, em uma única consulta, um mapa mat → "PG MAT NOME_GUERRA" para
   * todos os confirmadores/saídas/verificadores presentes na lista de escalas.
   * Evita N+1 quando exibimos quem confirmou presença, quem deu saída e
   * quem fez a 1ª/2ª verificação.
   */
  private async construirMapaNomes(
    escalas: EscalaEntity[],
  ): Promise<Map<string, string>> {
    const mats = new Set<string>();
    for (const e of escalas) {
      if (e.presencaConfirmadaPor?.mat) mats.add(e.presencaConfirmadaPor.mat);
      if (e.saidaConfirmadaPor?.mat) mats.add(e.saidaConfirmadaPor.mat);
      if (e.verificador1?.mat) mats.add(e.verificador1.mat);
      if (e.verificador2?.mat) mats.add(e.verificador2.mat);
    }

    const mapa = new Map<string, string>();
    if (!mats.size) return mapa;

    const sgps = await this.dadosSgpRepo
      .createQueryBuilder('sgp')
      .where('sgp.matSgp IN (:...mats)', { mats: [...mats] })
      .getMany();

    sgps.forEach((sgp) => {
      mapa.set(sgp.matSgp, `${sgp.pgSgp} ${sgp.matSgp} ${sgp.nomeGuerraSgp}`);
    });

    return mapa;
  }

  /** Resolve, a partir do mapa acima, os nomes prontos para o ReturnEscalaDto. */
  private resolverNomes(
    e: EscalaEntity,
    sgpMap: Map<string, string>,
  ): {
    confirmador?: string | null;
    saidaPor?: string | null;
    verificador1?: string | null;
    verificador2?: string | null;
  } {
    return {
      confirmador: e.presencaConfirmadaPor?.mat
        ? (sgpMap.get(e.presencaConfirmadaPor.mat) ?? null)
        : null,
      saidaPor: e.saidaConfirmadaPor?.mat
        ? (sgpMap.get(e.saidaConfirmadaPor.mat) ?? null)
        : null,
      verificador1: e.verificador1?.mat
        ? (sgpMap.get(e.verificador1.mat) ?? null)
        : null,
      verificador2: e.verificador2?.mat
        ? (sgpMap.get(e.verificador2.mat) ?? null)
        : null,
    };
  }

  // ── Find by matrícula — PJES ─────────────────────────────────────────────────

  async findByMatriculaPjes(
    mat: string,
    mes: number,
    ano: number,
  ): Promise<ReturnEscalaDto[]> {
    const escalas = await this.repo
      .createQueryBuilder('e')
      .where('e.mat_escala = :mat', { mat })
      .andWhere('e.sistema = :sistema', { sistema: 'PJES' })
      .andWhere('EXTRACT(MONTH FROM e.data_inicio) = :mes', { mes })
      .andWhere('EXTRACT(YEAR FROM e.data_inicio) = :ano', { ano })
      .orderBy('e.data_inicio', 'ASC')
      .addOrderBy('e.hora_inicio', 'ASC')
      .getMany();

    return escalas.map((e) => new ReturnEscalaDto(e));
  }

  // ── Find by matrícula — DIARIAS ───────────────────────────────────────────────

  async findByMatriculaDiarias(
    mat: string,
    dataInicio: string,
    dataFim: string,
  ): Promise<ReturnEscalaDto[]> {
    const escalas = await this.repo
      .createQueryBuilder('e')
      .where('e.mat_escala = :mat', { mat })
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

  // ── Delete ──────────────────────────────────────────────────────────────────

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
      this.verificarStatusEvento(escala.operacao.id),
    ]);

    await this.repo.delete(id);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Vagas em aberto (operação compartilhada)
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * DONO         = OME do evento (mesma regra de verificarPermissaoOme) ou MASTER/TECNICO
   * PARTICIPANTE = OME presente em operacao_ome_compartilhada
   */
  private async papelNaOperacao(
    operacaoId: number,
    user: { typeUser: number; omeId: number },
  ): Promise<'DONO' | 'PARTICIPANTE' | 'NENHUM'> {
    const tipo = Number(user.typeUser);
    if (tipo === UserType.MASTER || tipo === UserType.TECNICO) return 'DONO';

    const operacao = await this.operacaoRepo.findOne({
      where: { id: operacaoId },
      relations: { evento: { ome: true } },
    });
    if (!operacao) throw new NotFoundException('Operação não encontrada');

    if (Number(operacao.evento?.ome?.id) === Number(user.omeId)) return 'DONO';

    const participa = await this.compRepo.exists({
      where: { operacao: { id: operacaoId }, ome: { id: user.omeId } },
    });
    return participa ? 'PARTICIPANTE' : 'NENHUM';
  }

  /** Copia o "snapshot" do usuário/SGP para a escala (usado ao preencher/substituir). */
  private copiarDadosDoUsuario(
    escala: EscalaEntity,
    usuario: UserEntity,
    sgp: DadosSgpEntity,
  ): void {
    escala.usuario = { id: usuario.id } as UserEntity;
    escala.conta = usuario.conta ?? null; // null: não herdar a conta da pessoa anterior
    escala.pg_escala = sgp.pgSgp;
    escala.mat_escala = sgp.matSgp;
    escala.ng_escala = sgp.nomeGuerraSgp;
    escala.cpf_escala = sgp.cpfSgp;
    escala.nomecompleto_escala = sgp.nomeCompletoSgp;
    escala.nomeome_escala = usuario.ome?.nomeOme ?? '';
    escala.nunfunc_escala = sgp.nunfuncSgp;
    escala.nunvinc_escala = sgp.nunvincSgp;
    // tipo_escala NÃO muda: o usuário precisa ter o mesmo tipo (validado antes)
  }

  private validarTipoDoUsuario(escala: EscalaEntity, sgp: DadosSgpEntity) {
    if (sgp.tipoSgp !== escala.tipo_escala) {
      const esperado = escala.tipo_escala === 'O' ? 'Oficial' : 'Praça';
      throw new BadRequestException(
        `Esta escala é de ${esperado}. O militar informado não é do mesmo tipo.`,
      );
    }
  }

  private tratarErroUnique(
    error: unknown,
    mat: string,
    data: string,
    sistema: string,
  ) {
    const dbError = error as { driverError?: { code?: string } };
    if (dbError?.driverError?.code === '23505') {
      throw new BadRequestException(
        `Matrícula ${mat} já está escalada em ${data} para ${sistema}`,
      );
    }
    throw error;
  }

  // ── Criar vaga (somente OME dona) ───────────────────────────────────────────

  async criarVaga(
    dto: CreateVagaDto,
    usuarioLogado: { id: number; typeUser: number; omeId: number },
  ): Promise<ReturnEscalaDto> {
    // Auxiliar só na própria OME (dono); participante cai aqui em 403.
    await this.verificarPermissaoOme(dto.operacaoId, usuarioLogado);
    await this.verificarStatusEvento(dto.operacaoId);

    const compartilhada = await this.compRepo.exists({
      where: {
        operacao: { id: dto.operacaoId },
        ome: { id: dto.omeDestinoId },
      },
    });
    if (!compartilhada) {
      throw new BadRequestException(
        'A OME de destino não está no compartilhamento desta operação',
      );
    }

    // A vaga CONSOME cota na criação (reserva o espaço no teto da operação).
    const cota = this.calcularCota(dto.horaInicio, dto.horaFim, dto.sistema);
    await this.verificarTeto(dto.operacaoId, dto.tipoEscala, cota);

    const vaga = this.repo.create({
      sistema: dto.sistema,
      operacao: { id: dto.operacaoId },
      isVagaAberta: true,
      omeDestinoId: dto.omeDestinoId,

      pg_escala: null,
      mat_escala: null,
      ng_escala: null,
      cpf_escala: null,
      nomecompleto_escala: null,
      nunfunc_escala: null,
      nunvinc_escala: null,
      tipo_escala: dto.tipoEscala,
      nomeome_escala: '',

      dataInicio: dto.dataInicio,
      horaInicio: dto.horaInicio,
      horaFim: dto.horaFim,
      cota_escala: cota,
      localApresentacao: dto.localApresentacao ?? 'SEDE DA OME',
      funcao: dto.funcao,
      situacao: dto.situacao ?? 'REGULAR',
      anotacoes: dto.anotacoes,
    });

    const saved = await this.repo.save(vaga);
    return this.findOne(saved.id);
  }

  // ── Preencher vaga (OME destino ou dona) ────────────────────────────────────

  async preencherVaga(
    id: number,
    dto: PreencherVagaDto,
    usuarioLogado: { id: number; typeUser: number; omeId: number },
  ): Promise<ReturnEscalaDto> {
    const escala = await this.repo.findOne({
      where: { id },
      relations: { operacao: true },
    });
    if (!escala) throw new NotFoundException('Escala não encontrada');

    if (!escala.isVagaAberta) {
      throw new BadRequestException(
        'Esta escala não é uma vaga em aberto (ou já foi preenchida)',
      );
    }

    const operacaoId = escala.operacao.id;

    const papel = await this.papelNaOperacao(operacaoId, usuarioLogado);
    const autorizado =
      papel === 'DONO' ||
      (papel === 'PARTICIPANTE' &&
        Number(escala.omeDestinoId) === Number(usuarioLogado.omeId));
    if (!autorizado) {
      throw new ForbiddenException('Esta vaga não está destinada à sua OME');
    }

    await this.verificarStatusEvento(operacaoId);

    const { usuario, sgp } = await this.buscarUsuario(dto.usuarioId);

    if (
      papel === 'PARTICIPANTE' &&
      Number(usuario.omeId) !== Number(usuarioLogado.omeId)
    ) {
      throw new ForbiddenException(
        'Você só pode escalar militares da sua própria OME',
      );
    }

    this.validarTipoDoUsuario(escala, sgp);

    await this.verificarConflito(sgp.matSgp, escala.dataInicio, escala.sistema);
    await this.verificarLimiteCotasUsuario(
      sgp.matSgp,
      escala.sistema,
      operacaoId,
      escala.cota_escala,
      escala.id,
    );
    if (dto.viaturaId) {
      await this.verificarViatura(dto.viaturaId, escala.funcao, operacaoId);
    }

    try {
      await this.dataSource.transaction(async (manager) => {
        // Trava a linha: se duas pessoas preencherem ao mesmo tempo, só uma passa.
        const travada = await manager.findOne(EscalaEntity, {
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!travada || !travada.isVagaAberta) {
          throw new BadRequestException('Esta vaga já foi preenchida');
        }

        this.copiarDadosDoUsuario(travada, usuario, sgp);
        travada.isVagaAberta = false;
        travada.preenchidaPorId = usuarioLogado.id;
        travada.preenchidaEm = new Date();
        if (dto.viaturaId) travada.viaturaId = dto.viaturaId;

        await manager.save(travada);
      });
    } catch (error: unknown) {
      this.tratarErroUnique(
        error,
        sgp.matSgp,
        escala.dataInicio,
        escala.sistema,
      );
    }

    return this.findOne(id);
  }

  /** Zera tudo que pertencia ao militar anterior (presença, saída, verificações, repasse). */
  private zerarRegistrosDoServico(escala: EscalaEntity): void {
    Object.assign(escala, {
      presencaConfirmada: false,
      presencaConfirmadaEm: null,
      presencaConfirmadaPorId: null,
      presencaLatitude: null,
      presencaLongitude: null,

      saidaConfirmada: false,
      saidaConfirmadaEm: null,
      saidaConfirmadaPorId: null,

      primeiraVerificacao: false,
      idVerificador1: null,
      dataHoraVerificador1: null,
      obsVerificador1: null,

      segundaVerificacao: false,
      idVerificador2: null,
      dataHoraVerificador2: null,
      obsVerificador2: null,

      isRepasse: false,
      repasseOrigemId: null,
    });
  }

  // ── Substituir militar (NÃO usa o update genérico; zera o serviço) ──────────

  async substituirUsuario(
    id: number,
    dto: SubstituirUsuarioDto,
    usuarioLogado: { id: number; typeUser: number; omeId: number },
  ): Promise<ReturnEscalaDto> {
    const escala = await this.repo.findOne({
      where: { id },
      relations: { operacao: true, usuario: true },
    });
    if (!escala) throw new NotFoundException('Escala não encontrada');

    if (escala.isVagaAberta) {
      throw new BadRequestException(
        'Esta escala é uma vaga em aberto: use o preenchimento',
      );
    }

    const operacaoId = escala.operacao.id;
    const papel = await this.papelNaOperacao(operacaoId, usuarioLogado);

    if (papel === 'NENHUM') {
      throw new ForbiddenException('Você não participa desta operação');
    }
    if (
      papel === 'PARTICIPANTE' &&
      Number(escala.omeDestinoId) !== Number(usuarioLogado.omeId)
    ) {
      throw new ForbiddenException(
        'Você só pode alterar registros que pertencem à sua OME',
      );
    }

    await this.verificarStatusEvento(operacaoId);

    if (escala.usuario?.id === dto.usuarioId) {
      throw new BadRequestException('Este militar já está nesta escala');
    }

    const { usuario, sgp } = await this.buscarUsuario(dto.usuarioId);

    if (
      papel === 'PARTICIPANTE' &&
      Number(usuario.omeId) !== Number(usuarioLogado.omeId)
    ) {
      throw new ForbiddenException(
        'Você só pode escalar militares da sua própria OME',
      );
    }

    this.validarTipoDoUsuario(escala, sgp);

    await this.verificarConflito(
      sgp.matSgp,
      escala.dataInicio,
      escala.sistema,
      escala.id,
    );
    await this.verificarLimiteCotasUsuario(
      sgp.matSgp,
      escala.sistema,
      operacaoId,
      escala.cota_escala,
      escala.id,
    );

    this.copiarDadosDoUsuario(escala, usuario, sgp);
    this.zerarRegistrosDoServico(escala);

    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.save(escala);

        // Repasse ABERTO feito pelo militar anterior perde o sentido: cancela.
        await manager.query(
          `UPDATE "repasse" SET "status_repasse" = 'CANCELADO', "updated_at" = NOW()
           WHERE "escala_id" = $1 AND "status_repasse" = 'ABERTO'`,
          [id],
        );
      });
    } catch (error: unknown) {
      this.tratarErroUnique(
        error,
        sgp.matSgp,
        escala.dataInicio,
        escala.sistema,
      );
    }

    return this.findOne(id);
  }

  // ── Listar vagas abertas ────────────────────────────────────────────────────

  async listarVagas(
    usuarioLogado: { id: number; typeUser: number; omeId: number },
    operacaoId?: number,
  ): Promise<ReturnEscalaDto[]> {
    const qb = this.repo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.operacao', 'operacao')
      .leftJoinAndSelect('operacao.evento', 'evento')
      .leftJoinAndSelect('evento.ome', 'ome')
      .leftJoinAndSelect('e.omeDestino', 'omeDestino')
      .where('e.is_vaga_aberta = true')
      .andWhere("evento.status_evento = 'CRIADO'")
      .orderBy('e.data_inicio', 'ASC')
      .addOrderBy('e.hora_inicio', 'ASC');

    if (operacaoId) qb.andWhere('e.operacao_id = :operacaoId', { operacaoId });

    const tipo = Number(usuarioLogado.typeUser);
    const ehMasterOuTecnico =
      tipo === UserType.MASTER || tipo === UserType.TECNICO;

    // Participante só vê as vagas destinadas à sua OME
    if (!ehMasterOuTecnico) {
      qb.andWhere('e.ome_destino_id = :omeId', { omeId: usuarioLogado.omeId });
    }

    const vagas = await qb.getMany();
    return vagas.map((e) => new ReturnEscalaDto(e, {}));
  }

  // ── Upload em massa (somente MASTER) ─────────────────────────────────────────

  private paraDataString(valor: any): string {
    if (valor instanceof Date) {
      const y = valor.getUTCFullYear();
      const m = String(valor.getUTCMonth() + 1).padStart(2, '0');
      const d = String(valor.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return String(valor).slice(0, 10);
  }

  private readonly LIMITE_MAX_LINHAS_UPLOAD = 20000;

  async bulkUpload(
    buffer: Buffer,
    usuarioLogado: { id: number; typeUser: number; omeId: number },
  ): Promise<{ inseridos: number; mensagem: string }> {
    if (Number(usuarioLogado.typeUser) !== UserType.MASTER) {
      throw new ForbiddenException(
        'Somente usuários MASTER podem importar planilhas de escala',
      );
    }

    let linhasBrutas;
    try {
      linhasBrutas = await lerPlanilhaEscalas(buffer);
    } catch (err: any) {
      throw new BadRequestException(
        err?.message || 'Não foi possível ler a planilha enviada',
      );
    }

    if (linhasBrutas.length === 0) {
      throw new BadRequestException(
        'A planilha não possui registros para importar',
      );
    }
    if (linhasBrutas.length > this.LIMITE_MAX_LINHAS_UPLOAD) {
      throw new BadRequestException(
        `A planilha possui ${linhasBrutas.length} linhas. O limite por importação é ${this.LIMITE_MAX_LINHAS_UPLOAD}`,
      );
    }

    const erros: { linha: number; mensagens: string[] }[] = [];
    const linhasValidas: { linha: number; dto: BulkEscalaRowDto }[] = [];

    for (const { linha, dados } of linhasBrutas) {
      const dto = plainToInstance(BulkEscalaRowDto, dados);
      const erroValidacao = await validate(dto, { whitelist: true });

      if (erroValidacao.length > 0) {
        const mensagens = erroValidacao.flatMap((e) =>
          Object.values(e.constraints ?? {}),
        );
        erros.push({ linha, mensagens });
        continue;
      }
      linhasValidas.push({ linha, dto });
    }

    if (erros.length > 0) {
      throw new BadRequestException({
        message:
          'A planilha contém erros de preenchimento. Nenhum registro foi importado.',
        totalLinhas: linhasBrutas.length,
        totalErros: erros.length,
        erros,
      });
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const operacaoIds = [
        ...new Set(linhasValidas.map((l) => l.dto.operacaoId)),
      ];
      const usuarioIds = [
        ...new Set(linhasValidas.map((l) => l.dto.usuarioId)),
      ];
      const viaturaIds = [
        ...new Set(
          linhasValidas
            .map((l) => l.dto.viaturaId)
            .filter((v): v is number => v !== undefined && v !== null),
        ),
      ];

      const [operacoes, usuarios, viaturas] = await Promise.all([
        queryRunner.manager.find(Operacao, {
          where: { id: In(operacaoIds) },
          relations: { evento: { ome: true } },
        }),
        queryRunner.manager.find(UserEntity, {
          where: { id: In(usuarioIds) },
          relations: { conta: true, ome: true },
        }),
        viaturaIds.length
          ? queryRunner.manager.find(ViaturaEntity, {
              where: { id: In(viaturaIds) },
            })
          : Promise.resolve([] as ViaturaEntity[]),
      ]);

      const operacaoMap = new Map(operacoes.map((o) => [o.id, o]));
      const usuarioMap = new Map(usuarios.map((u) => [u.id, u]));
      const viaturaMap = new Map(viaturas.map((v) => [v.id, v]));

      const matsReferenciados = [
        ...new Set(usuarios.map((u) => u.mat).filter(Boolean)),
      ];

      const sgps = matsReferenciados.length
        ? await queryRunner.manager.find(DadosSgpEntity, {
            where: { matSgp: In(matsReferenciados) },
          })
        : [];
      const sgpMap = new Map(sgps.map((s) => [s.matSgp, s]));

      const conflitoSet = new Set<string>();
      const tetoMap = new Map<string, number>();
      const pjesMensalMap = new Map<string, number>();
      const diariasOperacaoMap = new Map<string, number>();

      if (matsReferenciados.length) {
        const existentes = await queryRunner.manager
          .createQueryBuilder(EscalaEntity, 'e')
          .select('e.mat_escala', 'mat')
          .addSelect('e.data_inicio', 'data')
          .addSelect('e.sistema', 'sistema')
          .addSelect('e.tipo_escala', 'tipo')
          .addSelect('e.operacao_id', 'operacaoid')
          .addSelect('e.cota_escala', 'cota')
          .where('e.mat_escala IN (:...mats)', { mats: matsReferenciados })
          .getRawMany<{
            mat: string;
            data: string;
            sistema: string;
            tipo: string;
            operacaoid: number;
            cota: number;
          }>();

        for (const row of existentes) {
          const dataRow = this.paraDataString(row.data);

          conflitoSet.add(`${row.mat}|${dataRow}|${row.sistema}`);

          const chaveTeto = `${row.operacaoid}|${row.tipo}`;
          tetoMap.set(
            chaveTeto,
            (tetoMap.get(chaveTeto) ?? 0) + Number(row.cota),
          );

          if (row.sistema === 'PJES') {
            const [ano, mes] = dataRow.split('-');
            const chave = `${row.mat}|${Number(mes)}|${Number(ano)}`;
            pjesMensalMap.set(
              chave,
              (pjesMensalMap.get(chave) ?? 0) + Number(row.cota),
            );
          }

          if (row.sistema === 'DIARIAS') {
            const chave = `${row.mat}|${row.operacaoid}`;
            diariasOperacaoMap.set(
              chave,
              (diariasOperacaoMap.get(chave) ?? 0) + Number(row.cota),
            );
          }
        }
      }

      const novosRegistros: Partial<EscalaEntity>[] = [];

      for (const { linha, dto } of linhasValidas) {
        const mensagensLinha: string[] = [];

        const operacao = operacaoMap.get(dto.operacaoId);
        if (!operacao)
          mensagensLinha.push(`Operação ${dto.operacaoId} não encontrada`);
        if (operacao && operacao.evento.status_evento !== 'CRIADO') {
          mensagensLinha.push(
            `Operação ${dto.operacaoId} está com evento em status ${operacao.evento.status_evento} (só aceita lançamentos em CRIADO)`,
          );
        }

        const usuario = usuarioMap.get(dto.usuarioId);
        if (!usuario)
          mensagensLinha.push(`Usuário ${dto.usuarioId} não encontrado`);

        const sgp = usuario ? sgpMap.get(usuario.mat) : undefined;
        if (usuario && !sgp) {
          mensagensLinha.push(
            `Não há registro em dadosSgp para a matrícula ${usuario.mat} (usuarioId ${dto.usuarioId})`,
          );
        }

        let viatura: ViaturaEntity | undefined;
        if (dto.viaturaId !== undefined) {
          if (!this.FUNCOES_COM_VIATURA.includes(dto.funcao)) {
            mensagensLinha.push(
              `A função "${dto.funcao}" não permite atribuição de viatura`,
            );
          }
          viatura = viaturaMap.get(dto.viaturaId);
          if (!viatura) {
            mensagensLinha.push(`Viatura ${dto.viaturaId} não encontrada`);
          } else if (operacao && viatura.omeId !== operacao.evento?.ome?.id) {
            mensagensLinha.push(
              `Viatura ${dto.viaturaId} não pertence à OME do evento da operação ${dto.operacaoId}`,
            );
          }
        }

        if (mensagensLinha.length > 0 || !operacao || !usuario || !sgp) {
          erros.push({ linha, mensagens: mensagensLinha });
          continue;
        }

        const cota = this.calcularCota(
          dto.horaInicio,
          dto.horaFim,
          dto.sistema,
        );

        const chaveConflito = `${sgp.matSgp}|${dto.dataInicio}|${dto.sistema}`;
        if (conflitoSet.has(chaveConflito)) {
          mensagensLinha.push(
            `Matrícula ${sgp.matSgp} já está escalada em ${dto.dataInicio} para ${dto.sistema} (registro existente ou duplicado na própria planilha)`,
          );
        }

        const chaveTeto = `${dto.operacaoId}|${sgp.tipoSgp}`;
        const somaTeto = tetoMap.get(chaveTeto) ?? 0;
        if (
          sgp.tipoSgp === 'O' &&
          somaTeto + cota > operacao.qtd_oficiais_oper
        ) {
          mensagensLinha.push(
            `Sem cotas de Oficiais disponíveis na Operação ${dto.operacaoId}`,
          );
        }
        if (sgp.tipoSgp === 'P' && somaTeto + cota > operacao.qtd_pracas_oper) {
          mensagensLinha.push(
            `Sem cotas de Praças disponíveis na Operação ${dto.operacaoId}`,
          );
        }

        let chavePjes = '';
        if (dto.sistema === 'PJES') {
          const [ano, mes] = dto.dataInicio.split('-');
          chavePjes = `${sgp.matSgp}|${Number(mes)}|${Number(ano)}`;
          const soma = pjesMensalMap.get(chavePjes) ?? 0;
          if (soma + cota > 12) {
            mensagensLinha.push(
              `Matrícula ${sgp.matSgp} excede o limite de 12 cotas PJES no mês ${mes}/${ano}`,
            );
          }
        }

        let chaveDiarias = '';
        if (dto.sistema === 'DIARIAS') {
          chaveDiarias = `${sgp.matSgp}|${dto.operacaoId}`;
          const soma = diariasOperacaoMap.get(chaveDiarias) ?? 0;
          if (soma + cota > 30) {
            mensagensLinha.push(
              `Matrícula ${sgp.matSgp} excede o limite de 30 cotas DIARIAS na Operação ${dto.operacaoId}`,
            );
          }
        }

        if (mensagensLinha.length > 0) {
          erros.push({ linha, mensagens: mensagensLinha });
          continue;
        }

        conflitoSet.add(chaveConflito);
        tetoMap.set(chaveTeto, somaTeto + cota);
        if (chavePjes)
          pjesMensalMap.set(
            chavePjes,
            (pjesMensalMap.get(chavePjes) ?? 0) + cota,
          );
        if (chaveDiarias)
          diariasOperacaoMap.set(
            chaveDiarias,
            (diariasOperacaoMap.get(chaveDiarias) ?? 0) + cota,
          );

        novosRegistros.push({
          sistema: dto.sistema,
          operacao: { id: dto.operacaoId } as Operacao,
          usuario: { id: dto.usuarioId } as UserEntity,
          pg_escala: sgp.pgSgp,
          mat_escala: sgp.matSgp,
          ng_escala: sgp.nomeGuerraSgp,
          tipo_escala: sgp.tipoSgp,
          cpf_escala: sgp.cpfSgp,
          nomecompleto_escala: sgp.nomeCompletoSgp,
          nomeome_escala: usuario.ome?.nomeOme ?? '',
          nunfunc_escala: sgp.nunfuncSgp,
          nunvinc_escala: sgp.nunvincSgp,
          conta: usuario.conta ?? undefined,
          dataInicio: dto.dataInicio,
          horaInicio: dto.horaInicio,
          horaFim: dto.horaFim,
          cota_escala: cota,
          localApresentacao:
            dto.localApresentacao ?? sgp.localApresentacaoSgp ?? 'SEDE DA OME',
          funcao: dto.funcao,
          situacao: dto.situacao ?? 'REGULAR',
          anotacoes: dto.anotacoes,
          viaturaId: dto.viaturaId ?? undefined,
        });
      }

      if (erros.length > 0) {
        await queryRunner.rollbackTransaction();
        throw new BadRequestException({
          message:
            'A planilha contém inconsistências de regras de negócio. Nenhum registro foi importado.',
          totalLinhas: linhasBrutas.length,
          totalErros: erros.length,
          erros,
        });
      }

      const TAMANHO_LOTE = 500;
      for (let i = 0; i < novosRegistros.length; i += TAMANHO_LOTE) {
        await queryRunner.manager.insert(
          EscalaEntity,
          novosRegistros.slice(i, i + TAMANHO_LOTE),
        );
      }

      await queryRunner.commitTransaction();

      return {
        inseridos: novosRegistros.length,
        mensagem: `${novosRegistros.length} escalas importadas com sucesso`,
      };
    } catch (error) {
      if (queryRunner.isTransactionActive)
        await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
