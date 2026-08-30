import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { RepasseEntity, StatusRepasse } from './entities/repasse.entity';
import { EscalaEntity } from 'src/escala/entities/escala.entity';
import { UserEntity } from 'src/user/entities/user.entity';
import { DadosSgpEntity } from 'src/dadossgp/entities/dadossgp.entity';
import { CreateRepasseDto } from './dtos/create-repasse.dto';
import { ReturnRepasseDto } from './dtos/return-repasse.dto';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class RepasseService {
  private readonly countCache = new Map<
    number,
    { count: number; expiresAt: number }
  >();
  private readonly COUNT_CACHE_TTL_MS = 2000;

  async countAbertosParaMimCached(
    usuarioLogado: {
      id: number;
      mat: string;
      omeId: number;
    },
    tipoEscalaJwt?: string,
  ): Promise<number> {
    const cached = this.countCache.get(usuarioLogado.id);
    const now = Date.now();

    if (cached && cached.expiresAt > now) {
      return cached.count;
    }

    const count = await this.countAbertosParaMim(usuarioLogado, tipoEscalaJwt);

    this.countCache.set(usuarioLogado.id, {
      count,
      expiresAt: now + this.COUNT_CACHE_TTL_MS,
    });

    return count;
  }

  constructor(
    @InjectRepository(RepasseEntity)
    private readonly repo: Repository<RepasseEntity>,

    @InjectRepository(EscalaEntity)
    private readonly escalaRepo: Repository<EscalaEntity>,

    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,

    @InjectRepository(DadosSgpEntity)
    private readonly dadosSgpRepo: Repository<DadosSgpEntity>,

    private readonly dataSource: DataSource,
  ) {}

  private async verificarLimiteCotasUsuarioRepasse(
    matEscala: string,
    sistema: string,
    operacaoId: number,
    novaCota: number,
  ): Promise<void> {
    const LIMITE_PJES = 12;
    const LIMITE_DIARIAS = 30;

    if (sistema === 'PJES') {
      const qb = this.escalaRepo
        .createQueryBuilder('e')
        .select('COALESCE(SUM(e.cota_escala), 0)', 'soma')
        .where('e.mat_escala = :mat', { mat: matEscala })
        .andWhere('e.sistema = :sistema', { sistema })
        .andWhere(
          `EXTRACT(MONTH FROM e.data_inicio) = (
          SELECT EXTRACT(MONTH FROM e2.data_inicio)
          FROM escala e2
          WHERE e2.operacao_id = :operacaoId
          LIMIT 1
        )`,
          { operacaoId },
        )
        .andWhere(
          `EXTRACT(YEAR FROM e.data_inicio) = (
          SELECT EXTRACT(YEAR FROM e2.data_inicio)
          FROM escala e2
          WHERE e2.operacao_id = :operacaoId
          LIMIT 1
        )`,
          { operacaoId },
        );

      const result = await qb.getRawOne<{ soma: string }>();
      const somaAtual = Number(result?.soma ?? 0);

      if (somaAtual + novaCota > LIMITE_PJES) {
        throw new BadRequestException(
          `Você já está com ${somaAtual} cotas para o sistema PJES neste mês. Limite: ${LIMITE_PJES}`,
        );
      }
    }

    if (sistema === 'DIARIAS') {
      const result = await this.escalaRepo
        .createQueryBuilder('e')
        .select('COALESCE(SUM(e.cota_escala), 0)', 'soma')
        .where('e.mat_escala = :mat', { mat: matEscala })
        .andWhere('e.sistema = :sistema', { sistema })
        .andWhere('e.operacao_id = :operacaoId', { operacaoId })
        .getRawOne<{ soma: string }>();

      const somaAtual = Number(result?.soma ?? 0);

      if (somaAtual + novaCota > LIMITE_DIARIAS) {
        throw new BadRequestException(
          `Você já está com ${somaAtual} cotas para o sistema DIARIAS nesta operação. Limite: ${LIMITE_DIARIAS}`,
        );
      }
    }
  }

  async countAbertosParaMim(
    usuarioLogado: {
      id: number;
      mat: string;
      omeId: number;
    },
    tipoEscalaJwt?: string,
  ): Promise<number> {
    let tipoEscala = tipoEscalaJwt;
    if (!tipoEscala) {
      const sgp = await this.dadosSgpRepo.findOne({
        where: { matSgp: usuarioLogado.mat },
        select: { tipoSgp: true },
      });
      tipoEscala = sgp?.tipoSgp ?? 'P';
    }

    return this.repo
      .createQueryBuilder('r')
      .leftJoin('r.escala', 'escala')
      .leftJoin('escala.operacao', 'operacao')
      .leftJoin('operacao.evento', 'evento')
      .where('r.status_repasse = :status', { status: StatusRepasse.ABERTO })
      .andWhere('r.tipo_escala_repasse = :tipo', { tipo: tipoEscala })
      .andWhere('r.ofertante_id != :userId', { userId: usuarioLogado.id })
      .andWhere('(r.destinatario_id IS NULL OR r.destinatario_id = :userId)', {
        userId: usuarioLogado.id,
      })
      .andWhere('evento.ome_id = :omeId', { omeId: usuarioLogado.omeId })
      .andWhere(
        `(r.data_inicio_repasse::text || ' ' || r.hora_inicio_repasse::text)::timestamp > NOW()`,
      )
      .andWhere(
        `NOT EXISTS (
        SELECT 1 FROM escala e
        WHERE e.mat_escala = :mat
          AND e.data_inicio = r.data_inicio_repasse
          AND e.sistema = r.sistema_repasse::escala_sistema_enum
      )`,
        { mat: usuarioLogado.mat },
      )
      .getCount();
  }

  async buscarUsuariosParaRepasse(
    query: string,
    usuarioLogado: { id: number; omeId: number; mat: string },
    tipoEscalaJwt?: string,
  ): Promise<
    { mat: string; nomeGuerra: string; pg: string; imagemUrl: string | null }[]
  > {
    const termo = query.trim();
    if (termo.length < 6) return [];

    // ─── Resolve o tipo do usuário logado (P ou O) ──────────────────────────────
    let tipoEscala = tipoEscalaJwt;
    if (!tipoEscala) {
      const sgp = await this.dadosSgpRepo.findOne({
        where: { matSgp: usuarioLogado.mat },
        select: { tipoSgp: true },
      });
      tipoEscala = sgp?.tipoSgp ?? 'P';
    }

    const usuarios = await this.userRepo
      .createQueryBuilder('u')
      .innerJoin(DadosSgpEntity, 'sgp', 'sgp.matsgp = u.mat')
      .select([
        'u.id AS id',
        'u.mat AS mat',
        'u.imagemUrl AS "imagemUrl"',
        'sgp.nomeguerrasgp AS "nomeGuerra"',
        'sgp.pgsgp AS pg',
      ])
      .where('u.id != :userId', { userId: usuarioLogado.id })
      .andWhere('sgp.tiposgp = :tipo', { tipo: tipoEscala }) // ✅ NOVO — mesmo tipo do ofertante
      .andWhere('u.mat ILIKE :termo', { termo: `${termo}%` })
      .limit(8)
      .getRawMany();

    return usuarios.map((u) => ({
      mat: u.mat,
      nomeGuerra: u.nomeGuerra ?? '',
      pg: u.pg ?? '',
      imagemUrl: u.imagemUrl ?? null,
    }));
  }

  async create(
    dto: CreateRepasseDto,
    usuarioLogado: { id: number; mat: string; typeUser: number; omeId: number },
  ): Promise<ReturnRepasseDto> {
    const escala = await this.escalaRepo.findOne({
      where: { id: dto.escalaId },
      relations: { operacao: { evento: { ome: true } }, usuario: true },
    });

    if (!escala) throw new NotFoundException('Escala não encontrada');

    if (escala.usuario.mat !== usuarioLogado.mat) {
      throw new ForbiddenException(
        'Você só pode repassar escalas que pertencem a você',
      );
    }

    const statusEvento = escala.operacao?.evento?.status_evento;
    if (statusEvento !== 'CRIADO') {
      throw new ForbiddenException(
        `Não é possível repassar. O evento está ${statusEvento}`,
      );
    }

    const jaExiste = await this.repo.exists({
      where: {
        escala: { id: dto.escalaId },
        statusRepasse: StatusRepasse.ABERTO,
      },
    });
    if (jaExiste) {
      throw new BadRequestException(
        'Já existe um repasse aberto para esta escala',
      );
    }

    let destinatario: { id: number } | null = null;
    let matDestinatario: string | null = null;

    if (dto.matDestinatario?.trim()) {
      const mat = dto.matDestinatario.trim();

      if (mat === usuarioLogado.mat) {
        throw new BadRequestException('Você não pode repassar para si mesmo');
      }

      const [userDestino, sgpDestino] = await Promise.all([
        this.userRepo.findOne({ where: { mat } }),
        this.dadosSgpRepo.findOne({ where: { matSgp: mat } }),
      ]);

      if (!userDestino) {
        throw new NotFoundException(
          `Nenhum usuário encontrado com a matrícula ${mat}`,
        );
      }

      const tipoDestino = sgpDestino?.tipoSgp ?? 'P';
      if (tipoDestino !== escala.tipo_escala) {
        throw new BadRequestException(
          `Tipo incompatível: a matrícula ${mat} é "${tipoDestino}" e o serviço é para "${escala.tipo_escala}"`,
        );
      }

      const conflito = await this.escalaRepo
        .createQueryBuilder('e')
        .where('e.mat_escala = :mat', { mat })
        .andWhere('e.data_inicio = :data', { data: escala.dataInicio })
        .andWhere('e.sistema = :sistema', { sistema: escala.sistema })
        .getExists();

      if (conflito) {
        throw new BadRequestException(
          `O destinatário já está escalado no dia ${escala.dataInicio} para o sistema ${escala.sistema}`,
        );
      }

      await this.verificarLimiteCotasUsuarioRepasse(
        mat,
        escala.sistema,
        escala.operacao.id,
        escala.cota_escala,
      );

      destinatario = { id: userDestino.id };
      matDestinatario = mat;
    }

    const repasse = this.repo.create({
      escala: { id: dto.escalaId },
      ofertante: { id: usuarioLogado.id },
      receptor: null,
      destinatario,
      matDestinatario,
      statusRepasse: StatusRepasse.ABERTO,
      sistemaRepasse: escala.sistema,
      tipoEscalaRepasse: escala.tipo_escala,
      dataInicioRepasse: escala.dataInicio,
      horaInicioRepasse: escala.horaInicio,
      horaFimRepasse: escala.horaFim,
      matOfertante: escala.usuario.mat,
      motivo: dto.motivo ?? null,
    });

    const saved = await this.repo.save(repasse);
    return this.findOne(saved.id);
  }

  async aceitar(
    repasseId: number,
    usuarioLogado: { id: number; mat: string; typeUser: number },
  ): Promise<ReturnRepasseDto> {
    const [repasse, receptor, sgpReceptor] = await Promise.all([
      this.repo.findOne({
        where: { id: repasseId },
        relations: {
          escala: { operacao: { evento: { ome: true } } },
          ofertante: true,
          destinatario: true,
        },
      }),

      this.userRepo.findOne({
        where: { id: usuarioLogado.id },
        relations: { ome: true, conta: true },
      }),

      this.dadosSgpRepo
        .createQueryBuilder('sgp')
        .select([
          'sgp.id',
          'sgp.pgSgp',
          'sgp.nomeGuerraSgp',
          'sgp.tipoSgp',
          'sgp.cpfSgp',
          'sgp.nunfuncSgp',
          'sgp.nunvincSgp',
          'sgp.localApresentacaoSgp',
          'sgp.situacaoSgp',
          'sgp.nomeCompletoSgp',
          'sgp.matSgp',
        ])
        .where('sgp.matSgp = :mat', { mat: usuarioLogado.mat })
        .getOne(),
    ]);

    if (!repasse) throw new NotFoundException('Repasse não encontrado');
    if (!receptor)
      throw new NotFoundException('Usuário receptor não encontrado');

    if (repasse.statusRepasse !== StatusRepasse.ABERTO) {
      throw new BadRequestException(
        `Este repasse não está mais disponível (status: ${repasse.statusRepasse})`,
      );
    }

    if (repasse.ofertante.id === usuarioLogado.id) {
      throw new ForbiddenException('Você não pode aceitar seu próprio repasse');
    }

    if (repasse.destinatario && repasse.destinatario.id !== usuarioLogado.id) {
      throw new ForbiddenException(
        'Este repasse foi direcionado a outro usuário',
      );
    }

    const statusEvento = repasse.escala?.operacao?.evento?.status_evento;
    if (statusEvento !== 'CRIADO') {
      throw new ForbiddenException(
        `Não é possível aceitar. O evento está ${statusEvento}`,
      );
    }

    // ─── Mesma OME só é exigida para repasse GERAL (sem destinatário definido) ────
    if (
      !repasse.destinatario &&
      receptor.ome.id !== repasse.escala?.operacao?.evento?.ome?.id
    ) {
      throw new ForbiddenException(
        'Você só pode aceitar repasses de eventos da sua OME',
      );
    }

    const tipoReceptor = sgpReceptor?.tipoSgp ?? 'P';
    if (tipoReceptor !== repasse.tipoEscalaRepasse) {
      throw new ForbiddenException(
        `Tipo incompatível: você é "${tipoReceptor}" e o serviço é para "${repasse.tipoEscalaRepasse}"`,
      );
    }

    const conflito = await this.escalaRepo
      .createQueryBuilder('e')
      .where('e.mat_escala = :mat', { mat: usuarioLogado.mat })
      .andWhere('e.data_inicio = :data', { data: repasse.dataInicioRepasse })
      .andWhere('e.sistema = :sistema', { sistema: repasse.sistemaRepasse })
      .getExists();
    if (conflito) {
      throw new BadRequestException(
        `Você já está escalado no dia ${repasse.dataInicioRepasse} para o sistema ${repasse.sistemaRepasse}`,
      );
    }

    const cotaDoRepasse = repasse.escala.cota_escala;
    await this.verificarLimiteCotasUsuarioRepasse(
      usuarioLogado.mat,
      repasse.sistemaRepasse,
      repasse.escala.operacao.id,
      cotaDoRepasse,
    );

    await this.dataSource.transaction(async (manager) => {
      await manager.update(RepasseEntity, repasseId, {
        statusRepasse: StatusRepasse.ACEITO,
        receptor: { id: usuarioLogado.id },
      });

      await manager.update(EscalaEntity, repasse.escala.id, {
        usuario: { id: usuarioLogado.id },
        pg_escala: sgpReceptor?.pgSgp ?? '',
        mat_escala: sgpReceptor?.matSgp ?? usuarioLogado.mat,
        ng_escala: sgpReceptor?.nomeGuerraSgp ?? '',
        tipo_escala: sgpReceptor?.tipoSgp ?? '',
        cpf_escala: sgpReceptor?.cpfSgp ?? '',
        nomecompleto_escala: sgpReceptor?.nomeCompletoSgp ?? '',
        nomeome_escala: receptor.ome?.nomeOme ?? '',
        nunfunc_escala: sgpReceptor?.nunfuncSgp ?? '',
        nunvinc_escala: sgpReceptor?.nunvincSgp ?? '',
        situacao: sgpReceptor?.situacaoSgp ?? 'REGULAR',
        conta: receptor.conta ? { id: receptor.conta.id } : () => 'NULL',
        isRepasse: true,
        repasseOrigemId: repasseId,
      });
    });

    return this.findOne(repasseId);
  }

  async cancelar(
    repasseId: number,
    usuarioLogado: { id: number },
  ): Promise<ReturnRepasseDto> {
    const repasse = await this.repo.findOne({
      where: { id: repasseId },
      relations: { ofertante: true },
    });

    if (!repasse) throw new NotFoundException('Repasse não encontrado');

    if (repasse.ofertante.id !== usuarioLogado.id) {
      throw new ForbiddenException(
        'Apenas o ofertante pode cancelar este repasse',
      );
    }

    if (repasse.statusRepasse !== StatusRepasse.ABERTO) {
      throw new BadRequestException(
        'Só é possível cancelar repasses com status ABERTO',
      );
    }

    await this.repo.update(repasseId, {
      statusRepasse: StatusRepasse.CANCELADO,
    });

    return this.findOne(repasseId);
  }

  async findAbertosParaMim(
    usuarioLogado: { id: number; mat: string; omeId: number },
    tipoEscalaJwt?: string,
  ): Promise<ReturnRepasseDto[]> {
    let tipoEscala = tipoEscalaJwt;
    if (!tipoEscala) {
      const sgp = await this.dadosSgpRepo.findOne({
        where: { matSgp: usuarioLogado.mat },
        select: { tipoSgp: true },
      });
      tipoEscala = sgp?.tipoSgp ?? 'P';
    }

    const repasses = await this.repo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.escala', 'escala')
      .leftJoinAndSelect('escala.operacao', 'operacao')
      .leftJoinAndSelect('operacao.evento', 'evento')
      .leftJoinAndSelect('evento.ome', 'ome')
      .leftJoinAndSelect('r.ofertante', 'ofertante')
      .leftJoinAndSelect('r.destinatario', 'destinatario')
      .where('r.status_repasse = :status', { status: StatusRepasse.ABERTO })
      .andWhere('r.tipo_escala_repasse = :tipo', { tipo: tipoEscala })
      .andWhere('r.ofertante_id != :userId', { userId: usuarioLogado.id })
      .andWhere('(r.destinatario_id IS NULL OR r.destinatario_id = :userId)', {
        userId: usuarioLogado.id,
      })
      .andWhere('evento.ome_id = :omeId', { omeId: usuarioLogado.omeId })
      .andWhere(
        `(r.data_inicio_repasse::text || ' ' || r.hora_inicio_repasse::text)::timestamp > NOW()`,
      )
      .andWhere(
        `NOT EXISTS (
SELECT 1 FROM escala e
WHERE e.mat_escala = :mat
  AND e.data_inicio = r.data_inicio_repasse
  AND e.sistema = r.sistema_repasse::escala_sistema_enum
)`,
        { mat: usuarioLogado.mat },
      )
      .orderBy('r.data_inicio_repasse', 'ASC')
      .addOrderBy('r.hora_inicio_repasse', 'ASC')
      .getMany();

    const dtos = await Promise.all(
      repasses.map(async (r) => {
        const sgpOfertante = await this.dadosSgpRepo
          .createQueryBuilder('sgp')
          .select(['sgp.pgSgp', 'sgp.nomeGuerraSgp', 'sgp.situacaoSgp'])
          .where('sgp.matSgp = :mat', { mat: r.matOfertante })
          .getOne();

        return new ReturnRepasseDto(r, sgpOfertante, null);
      }),
    );

    return dtos;
  }

  async findMeusRepasses(usuarioLogado: {
    id: number;
  }): Promise<ReturnRepasseDto[]> {
    const repasses = await this.repo.find({
      where: { ofertante: { id: usuarioLogado.id } },
      relations: {
        escala: { operacao: { evento: { ome: true } } },
        ofertante: true,
        receptor: true,
        destinatario: true,
      },
      order: { createdAt: 'DESC' },
    });

    const dtos = await Promise.all(
      repasses.map(async (r) => {
        const sgpOfertante = await this.dadosSgpRepo
          .createQueryBuilder('sgp')
          .select(['sgp.pgSgp', 'sgp.nomeGuerraSgp', 'sgp.situacaoSgp'])
          .where('sgp.matSgp = :mat', { mat: r.matOfertante })
          .getOne();

        let sgpReceptor: any = null;
        if (r.receptor) {
          const receptorMat = await this.userRepo.findOne({
            where: { id: r.receptor.id },
            select: { mat: true },
          });
          if (receptorMat) {
            sgpReceptor = await this.dadosSgpRepo
              .createQueryBuilder('sgp')
              .select(['sgp.pgSgp', 'sgp.nomeGuerraSgp', 'sgp.situacaoSgp'])
              .where('sgp.matSgp = :mat', { mat: receptorMat.mat })
              .getOne();
          }
        }

        return new ReturnRepasseDto(r, sgpOfertante, sgpReceptor);
      }),
    );

    return dtos;
  }

  async findOne(id: number): Promise<ReturnRepasseDto> {
    const repasse = await this.repo.findOne({
      where: { id },
      relations: {
        escala: { operacao: { evento: { ome: true } } },
        ofertante: true,
        receptor: true,
        destinatario: true,
      },
    });
    if (!repasse) throw new NotFoundException('Repasse não encontrado');

    const sgpOfertante = await this.dadosSgpRepo
      .createQueryBuilder('sgp')
      .select(['sgp.pgSgp', 'sgp.nomeGuerraSgp', 'sgp.situacaoSgp'])
      .where('sgp.matSgp = :mat', { mat: repasse.matOfertante })
      .getOne();

    let sgpReceptor: any = null;
    if (repasse.receptor) {
      const receptorMat = await this.userRepo.findOne({
        where: { id: repasse.receptor.id },
        select: { mat: true },
      });
      if (receptorMat) {
        sgpReceptor = await this.dadosSgpRepo
          .createQueryBuilder('sgp')
          .select(['sgp.pgSgp', 'sgp.nomeGuerraSgp', 'sgp.situacaoSgp'])
          .where('sgp.matSgp = :mat', { mat: receptorMat.mat })
          .getOne();
      }
    }

    return new ReturnRepasseDto(repasse, sgpOfertante, sgpReceptor);
  }

  async findAll(): Promise<ReturnRepasseDto[]> {
    const repasses = await this.repo.find({
      relations: {
        escala: { operacao: { evento: { ome: true } } },
        ofertante: true,
        receptor: true,
        destinatario: true,
      },
      order: { createdAt: 'DESC' },
    });

    const dtos = await Promise.all(
      repasses.map(async (r) => {
        const sgpOfertante = await this.dadosSgpRepo
          .createQueryBuilder('sgp')
          .select(['sgp.pgSgp', 'sgp.nomeGuerraSgp', 'sgp.situacaoSgp'])
          .where('sgp.matSgp = :mat', { mat: r.matOfertante })
          .getOne();

        let sgpReceptor: any = null;
        if (r.receptor) {
          const receptorMat = await this.userRepo.findOne({
            where: { id: r.receptor.id },
            select: { mat: true },
          });
          if (receptorMat) {
            sgpReceptor = await this.dadosSgpRepo
              .createQueryBuilder('sgp')
              .select(['sgp.pgSgp', 'sgp.nomeGuerraSgp', 'sgp.situacaoSgp'])
              .where('sgp.matSgp = :mat', { mat: receptorMat.mat })
              .getOne();
          }
        }

        return new ReturnRepasseDto(r, sgpOfertante, sgpReceptor);
      }),
    );

    return dtos;
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async expirarRepassesVencidos(): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(RepasseEntity)
      .set({ statusRepasse: StatusRepasse.CANCELADO })
      .where('status_repasse = :status', { status: StatusRepasse.ABERTO })
      .andWhere(
        `(data_inicio_repasse::text || ' ' || hora_inicio_repasse::text)::timestamp <= NOW()`,
      )
      .execute();
  }
}
