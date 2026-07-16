import {
  BadRequestException,
  ForbiddenException,
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
import { ViaturaEntity } from 'src/viatura/entities/viatura.entity';
import { DadosSgpEntity } from 'src/dadossgp/entities/dadossgp.entity';
import { ReturnEscalaOperacaoDto } from './dtos/return-escala-operacao.dto';

import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { tmpdir } from 'os';
import { PagamentoEntity } from 'src/pagamento/entities/pagamento.entity';

const execFileAsync = promisify(execFile);

export interface CotasPorTipo {
  tipo_escala: string;
  totalCotas: number;
}

@Injectable()
export class EscalaService {
  constructor(
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
  ) {}

  private readonly FUNCOES_COM_VIATURA = ['CMT', 'MOT', 'FISCAL', 'PAT'];

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
    operacaoId: number, // ← era omeId, agora é operacaoId
  ): Promise<void> {
    if (!viaturaId) return;

    if (!this.FUNCOES_COM_VIATURA.includes(funcao)) {
      throw new BadRequestException(
        `A função "${funcao}" não permite atribuição de viatura`,
      );
    }

    const [viatura, operacao] = await Promise.all([
      this.viaturaRepo.findOne({ where: { id: viaturaId } }),
      this.operacaoRepo.findOne({
        where: { id: operacaoId },
        relations: { evento: { ome: true } },
      }),
    ]);

    if (!viatura) throw new NotFoundException('Viatura não encontrada');

    const omeDoEvento = operacao?.evento?.ome?.id;
    if (viatura.omeId !== omeDoEvento) {
      throw new ForbiddenException('A viatura não pertence à OME do evento');
    }
  }

  // Busca o usuário (com conta e ome) e o registro correspondente em dadosSgp.
  // Lança BadRequest se não houver SGP — não faz sentido escalar sem vínculo.
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

  private calcularCota(
    horaInicio: string,
    horaFim: string,
    sistema: string,
  ): number {
    if (sistema === 'PJES' && horaInicio === horaFim) return 2;
    return 1;
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
      // Limite mensal: soma todas as cotas do usuário no mesmo mês/ano
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
      // Limite por operação: soma todas as cotas do usuário na mesma operação
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

  // ── Find minhas escalas ─────────────────────────────────────────────────────

  async findMinhasEscalas(usuarioLogado: {
    id: number;
    mat: string;
  }): Promise<ReturnEscalaDto[]> {
    const escalas = await this.repo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.viatura', 'viatura')
      .leftJoinAndSelect('e.operacao', 'operacao')
      .leftJoinAndSelect('operacao.evento', 'evento')
      .leftJoinAndSelect('evento.distribuicao', 'distribuicao')
      .leftJoinAndSelect('distribuicao.teto', 'teto')
      .leftJoinAndSelect('evento.ome', 'ome')
      .leftJoinAndSelect('e.conta', 'conta')
      .leftJoinAndSelect('e.usuario', 'usuario')
      .leftJoinAndSelect('e.presencaConfirmadaPor', 'confirmador')
      .where('e.usuario_id = :usuarioId', { usuarioId: usuarioLogado.id })
      .orderBy('e.data_inicio', 'ASC')
      .addOrderBy('e.hora_inicio', 'ASC')
      .getMany();

    const agrupadoPorTeto = new Map<number | null, EscalaEntity[]>();
    for (const escala of escalas) {
      const idTeto = escala?.operacao?.evento?.distribuicao?.teto?.id ?? null;
      if (!agrupadoPorTeto.has(idTeto)) agrupadoPorTeto.set(idTeto, []);
      agrupadoPorTeto.get(idTeto)!.push(escala);
    }

    const somasPorTeto = new Map<number | null, number>();
    for (const [idTeto, escalasTeto] of agrupadoPorTeto.entries()) {
      const soma = escalasTeto.reduce(
        (acc, e) => acc + (e.cota_escala || 0),
        0,
      );
      somasPorTeto.set(idTeto, soma);
    }

    const matsConfirmadores = escalas
      .map((e) => e.presencaConfirmadaPor?.mat)
      .filter(Boolean) as string[];

    const sgpMap = new Map<string, string>();
    if (matsConfirmadores.length) {
      const sgps = await this.dadosSgpRepo
        .createQueryBuilder('sgp')
        .where('sgp.matSgp IN (:...mats)', { mats: matsConfirmadores })
        .getMany();
      sgps.forEach((sgp) => {
        sgpMap.set(
          sgp.matSgp,
          `${sgp.pgSgp} ${sgp.matSgp} ${sgp.nomeGuerraSgp}`,
        );
      });
    }

    // ✅ Fora do map — executa UMA vez só
    const pagamentosUsuario = await this.pagamentoRepo.find({
      where: { usuarioId: usuarioLogado.id },
    });

    const comentarioPorEvento = new Map<number, string | null>();
    for (const pg of pagamentosUsuario) {
      comentarioPorEvento.set(pg.eventoId, pg.comentario_pagamento ?? null);
    }

    // ✅ Map simples, sem aninhamento, sem await
    return escalas.map((e) => {
      const idTeto = e?.operacao?.evento?.distribuicao?.teto?.id ?? null;
      const somacota_escala = somasPorTeto.get(idTeto) || 0;
      const eventoId = e?.operacao?.evento?.id ?? null;

      let valorMultiplicador = 1;
      if (e.sistema === 'PJES') {
        if (e.tipo_escala === 'O') valorMultiplicador = 300;
        else if (e.tipo_escala === 'P') valorMultiplicador = 200;
      } else if (e.sistema === 'DIARIAS') {
        valorMultiplicador = 180;
      }
      const somaCotaFinal = somacota_escala * valorMultiplicador;

      let pagamento: string | null = null;
      if (e.sistema === 'PJES') {
        const statusTeto = e?.operacao?.evento?.distribuicao?.teto?.status;
        if (statusTeto === 'ABERTO') pagamento = 'Pendente';
        else if (statusTeto === 'ENCERRADO') pagamento = 'Pago';
      } else if (e.sistema === 'DIARIAS') {
        const statusEvento = e?.operacao?.evento?.status_evento;
        const dataStatus = e?.operacao?.evento?.updated_at;
        pagamento = statusEvento
          ? `${statusEvento}${dataStatus ? ' - ' + new Date(dataStatus).toLocaleString('pt-BR') : ''}`
          : null;
      }

      const nomeConfirmador = e.presencaConfirmadaPor?.mat
        ? (sgpMap.get(e.presencaConfirmadaPor.mat) ?? null)
        : null;

      return {
        ...new ReturnEscalaDto(e, nomeConfirmador),
        somacota_escala,
        somaCotaFinal,
        pagamento,
        comentario_pagamento: eventoId
          ? (comentarioPorEvento.get(eventoId) ?? null)
          : null,
      };
    });
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

    // Se for AUXILIAR, aplica restrições adicionais
    if (isAuxiliar) {
      const alvo = await this.userRepo.findOne({ where: { id: usuarioId } });
      if (!alvo) throw new NotFoundException('Usuário não encontrado');

      // Não pode ver escala de usuários fora da própria OME
      if (Number(alvo.omeId) !== Number(usuarioLogado.omeId)) {
        throw new ForbiddenException(
          'Auxiliar só pode visualizar a escala de usuários da sua OME',
        );
      }

      // Não pode ver escala de usuários da OME DPO SEDE (id = 1)
      if (Number(alvo.omeId) === 1) {
        throw new ForbiddenException(
          'Auxiliar não pode visualizar a escala de usuários da OME DPO SEDE',
        );
      }

      // Não pode ver TECNICO, MASTER ou DIRETOR, mesmo dentro da própria OME
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
      .where('e.usuario_id = :usuarioId', { usuarioId })
      .andWhere('e.sistema = :sistema', { sistema })
      .orderBy('e.data_inicio', 'ASC')
      .addOrderBy('e.hora_inicio', 'ASC')
      .getMany();

    const matsConfirmadores = escalas
      .map((e) => e.presencaConfirmadaPor?.mat)
      .filter(Boolean) as string[];

    const sgpMap = new Map<string, string>();
    if (matsConfirmadores.length) {
      const sgps = await this.dadosSgpRepo
        .createQueryBuilder('sgp')
        .where('sgp.matSgp IN (:...mats)', { mats: matsConfirmadores })
        .getMany();

      sgps.forEach((sgp) => {
        sgpMap.set(
          sgp.matSgp,
          `${sgp.pgSgp} ${sgp.matSgp} ${sgp.nomeGuerraSgp}`,
        );
      });
    }

    return escalas.map((e) => {
      const nomeConfirmador = e.presencaConfirmadaPor?.mat
        ? (sgpMap.get(e.presencaConfirmadaPor.mat) ?? null)
        : null;
      return new ReturnEscalaDto(e, nomeConfirmador);
    });
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

      // Snapshot do SGP — buscado automaticamente pelo backend
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
      escala.conta = usuario.conta ?? undefined;
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
      this.verificarConflito(novaMatEscala, novaData, novaSistema, id),
      this.verificarTeto(operacaoId, novaTipo, novaCota, id),
      this.verificarLimiteCotasUsuario(
        novaMatEscala,
        novaSistema,
        operacaoId,
        novaCota,
        id,
      ),
    ]);

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
    });

    try {
      await this.repo.save(escala);
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

  async findByOperacao(operacaoId: number): Promise<ReturnEscalaOperacaoDto> {
    const escalas = await this.repo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.viatura', 'viatura')
      .leftJoinAndSelect('e.usuario', 'usuario')
      .leftJoinAndSelect('e.conta', 'conta')
      .leftJoinAndSelect('e.operacao', 'operacao')
      .leftJoinAndSelect('operacao.evento', 'evento')
      .leftJoinAndSelect('e.presencaConfirmadaPor', 'confirmador')
      .where('e.operacao_id = :operacaoId', { operacaoId })
      .orderBy('e.data_inicio', 'ASC')
      .addOrderBy('e.hora_inicio', 'ASC')
      .getMany();

    // Busca todos os SGPs dos confirmadores de uma vez
    const matsConfirmadores = escalas
      .map((e) => e.presencaConfirmadaPor?.mat)
      .filter(Boolean) as string[];

    const sgpMap = new Map<string, string>();

    if (matsConfirmadores.length) {
      const sgps = await this.dadosSgpRepo
        .createQueryBuilder('sgp')
        .where('sgp.matSgp IN (:...mats)', { mats: matsConfirmadores })
        .getMany();

      sgps.forEach((sgp) => {
        sgpMap.set(
          sgp.matSgp,
          `${sgp.pgSgp} ${sgp.matSgp} ${sgp.nomeGuerraSgp}`,
        );
      });
    }

    const dtos = escalas.map((e) => {
      const nomeConfirmador = e.presencaConfirmadaPor?.mat
        ? (sgpMap.get(e.presencaConfirmadaPor.mat) ?? null)
        : null;

      return new ReturnEscalaDto(e, nomeConfirmador);
    });

    return new ReturnEscalaOperacaoDto(dtos);
  }

  async findByCodOp(codOp: string): Promise<ReturnEscalaDto[]> {
    const escalas = await this.repo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.viatura', 'viatura')
      .leftJoinAndSelect('e.usuario', 'usuario')
      .leftJoinAndSelect('e.conta', 'conta')
      .leftJoinAndSelect('e.operacao', 'operacao')
      .leftJoinAndSelect('operacao.evento', 'evento')
      .leftJoinAndSelect('evento.ome', 'ome')
      .leftJoinAndSelect('e.presencaConfirmadaPor', 'confirmador')
      .leftJoinAndSelect('e.observacaoEscritaPor', 'obsAutor')
      .where('operacao.cod_op = :codOp', { codOp })
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

    // Coleta todas as matrículas únicas (confirmador + autor da obs) em uma só query
    const mats = [
      ...escalas.map((e) => e.presencaConfirmadaPor?.mat),
      ...escalas.map((e) => e.observacaoEscritaPor?.mat),
    ].filter(Boolean) as string[];

    const sgpMap = new Map<string, string>();

    if (mats.length) {
      const sgps = await this.dadosSgpRepo
        .createQueryBuilder('sgp')
        .where('sgp.matSgp IN (:...mats)', { mats })
        .getMany();

      sgps.forEach((sgp) => {
        sgpMap.set(
          sgp.matSgp,
          `${sgp.pgSgp} ${sgp.matSgp} ${sgp.nomeGuerraSgp}`,
        );
      });
    }

    return escalas.map((e) => {
      const nomeConfirmador = e.presencaConfirmadaPor?.mat
        ? (sgpMap.get(e.presencaConfirmadaPor.mat) ?? null)
        : null;
      const nomeObsAutor = e.observacaoEscritaPor?.mat
        ? (sgpMap.get(e.observacaoEscritaPor.mat) ?? null)
        : null;
      return new ReturnEscalaDto(e, nomeConfirmador, nomeObsAutor);
    });
  }

  async generatePdf(
    operacaoId: number,
    matUsuario: string,
  ): Promise<{ buffer: Buffer; cod_op: string }> {
    const [dto, operacao] = await Promise.all([
      this.findByOperacao(operacaoId),
      this.operacaoRepo.findOneBy({ id: operacaoId }), // ← busca direta
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

    try {
      await execFileAsync('python3', [
        SCRIPT_PATH,
        payload,
        matUsuario,
        outputPath,
      ]);
      const buffer = fs.readFileSync(outputPath);
      return { buffer, cod_op }; // ← retorna os dois
    } finally {
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    }
  }

  // ── método de confirmação checagem da escala ────────────────────────────────────────────────────────

  async confirmarPresenca(
    escalaId: number,
    confirmado: boolean,
    observacao: string | undefined,
    usuarioLogado: { id: number; omeId: number },
  ): Promise<ReturnEscalaDto> {
    const escala = await this.repo.findOne({
      where: { id: escalaId },
      relations: { operacao: { evento: { ome: true } } },
    });

    if (!escala) throw new NotFoundException('Escala não encontrada');

    // ✅ Só pode confirmar presença NO DIA exato da escala — nem antes, nem depois
    const hoje = new Date();
    const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

    if (escala.dataInicio !== hojeStr) {
      throw new ForbiddenException(
        'A confirmação de presença só pode ser feita no dia da escala',
      );
    }

    const omeDoEvento = escala.operacao?.evento?.ome?.id;
    const mesmaOme = omeDoEvento === usuarioLogado.omeId;

    let ehFiscalNaData = false;
    if (!mesmaOme) {
      ehFiscalNaData = await this.repo.exists({
        where: {
          usuario: { id: usuarioLogado.id },
          dataInicio: escala.dataInicio,
          funcao: 'FISCAL',
        },
      });
    }

    if (!mesmaOme && !ehFiscalNaData) {
      throw new ForbiddenException(
        'Você só pode confirmar presença de escalas da sua OME, ou se estiver escalado como FISCAL nesta mesma data',
      );
    }

    escala.presencaConfirmada = confirmado;

    // Observação: sempre salva quando enviada; registra quem escreveu
    if (observacao !== undefined) {
      escala.presencaObservacao = observacao;
      if (observacao.trim()) {
        escala.observacaoEscritaPor = { id: usuarioLogado.id } as UserEntity;
        escala.observacaoEscritaEm = new Date();
      } else {
        // Usuário apagou a observação → limpa o autor também
        escala.observacaoEscritaPor = null;
        escala.observacaoEscritaEm = null;
      }
    }
    // Se observacao === undefined (não enviada), não toca no campo

    if (confirmado) {
      escala.presencaConfirmadaEm = new Date();
      escala.presencaConfirmadaPor = { id: usuarioLogado.id } as UserEntity;
    } else {
      escala.presencaConfirmadaEm = null;
      escala.presencaConfirmadaPor = null;
    }

    // A observação é sempre salva, independente do status de confirmação.
    // Só limpamos os campos de "quem confirmou" quando desmarca a presença.
    escala.presencaObservacao = observacao ?? escala.presencaObservacao ?? null;

    if (confirmado) {
      escala.presencaConfirmadaEm = new Date();
      escala.presencaConfirmadaPor = { id: usuarioLogado.id } as UserEntity;
    } else {
      escala.presencaConfirmadaEm = null;
      escala.presencaConfirmadaPor = null;
    }

    if (escala.dataInicio !== hojeStr) {
      throw new ForbiddenException(
        'A confirmação de presença só pode ser feita no dia da escala',
      );
    }

    // ✅ Bloqueia se o horário de término já passou
    const agora = new Date();
    const [hFim, mFim] = escala.horaFim.split(':').map(Number);
    const fimEscala = new Date();
    fimEscala.setHours(hFim, mFim, 0, 0);

    if (agora > fimEscala) {
      throw new ForbiddenException(
        'O horário de término da escala já passou. Não é mais possível registrar presença ou observação.',
      );
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
      .leftJoinAndSelect('e.observacaoEscritaPor', 'obsAutor')
      .where('e.id = :id', { id })
      .getOne();

    if (!escala) throw new NotFoundException('Escala não encontrada');

    const [nomeConfirmador, nomeObsAutor] = await Promise.all([
      this.buscarNomeConfirmador(escala.presencaConfirmadaPor?.mat),
      this.buscarNomeConfirmador(escala.observacaoEscritaPor?.mat),
    ]);

    return new ReturnEscalaDto(escala, nomeConfirmador, nomeObsAutor);
  }

  private async buscarNomeConfirmador(mat?: string): Promise<string | null> {
    if (!mat) return null;
    const sgp = await this.dadosSgpRepo.findOne({ where: { matSgp: mat } });
    console.log('SGP encontrado para mat', mat, ':', sgp); // 👈 debug
    if (!sgp) return null;
    return `${sgp.pgSgp} ${mat} ${sgp.nomeGuerraSgp}`;
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
}
