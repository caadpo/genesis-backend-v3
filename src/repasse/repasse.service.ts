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
  constructor(
    @InjectRepository(RepasseEntity)
    private readonly repo: Repository<RepasseEntity>,

    @InjectRepository(EscalaEntity)
    private readonly escalaRepo: Repository<EscalaEntity>,

    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,

    @InjectRepository(DadosSgpEntity)
    private readonly dadosSgpRepo: Repository<DadosSgpEntity>,

    // ✅ DataSource para transações atômicas (aceitar repasse + update escala)
    private readonly dataSource: DataSource,
  ) {}

  // ─── CRIAR REPASSE ──────────────────────────────────────────────────────────
  /**
   * O usuário logado anuncia que quer repassar uma escala sua.
   * Regras:
   *  - A escala deve pertencer ao usuário logado (via mat)
   *  - O evento ainda deve estar com status 'CRIADO' (mesma lógica do escala.service)
   *  - Não pode haver outro repasse ABERTO para a mesma escala
   */
  async create(
    dto: CreateRepasseDto,
    usuarioLogado: { id: number; mat: string; typeUser: number; omeId: number },
  ): Promise<ReturnRepasseDto> {
    // ✅ Uma query traz a escala + operacao + evento (necessário para verificar status)
    const escala = await this.escalaRepo.findOne({
      where: { id: dto.escalaId },
      relations: { operacao: { evento: true }, usuario: true },
    });

    if (!escala) throw new NotFoundException('Escala não encontrada');

    // ─── Pertence ao usuário logado? ──────────────────────────────────────────
    if (escala.usuario.mat !== usuarioLogado.mat) {
      throw new ForbiddenException(
        'Você só pode repassar escalas que pertencem a você',
      );
    }

    // ─── Evento ainda editável? ───────────────────────────────────────────────
    const statusEvento = escala.operacao?.evento?.status_evento;
    if (statusEvento !== 'CRIADO') {
      throw new ForbiddenException(
        `Não é possível repassar. O evento está ${statusEvento}`,
      );
    }

    // ─── Já existe repasse ABERTO para essa escala? ───────────────────────────
    // ✅ índice parcial IDX_repasse_escala_aberto garante unicidade no banco,
    //    mas verificamos antes para retornar mensagem amigável
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

    const repasse = this.repo.create({
      escala: { id: dto.escalaId },
      ofertante: { id: usuarioLogado.id },
      receptor: null,
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

  // ─── ACEITAR REPASSE ────────────────────────────────────────────────────────
  /**
   * O usuário logado aceita um repasse ABERTO.
   * Regras:
   *  - Repasse deve estar ABERTO
   *  - Receptor não pode ser o próprio ofertante
   *  - tipo_escala deve bater (P só pega de P, O só pega de O)
   *  - Receptor não pode já estar escalado no mesmo dia + mesmo sistema
   *  - Tudo ocorre em uma transação atômica:
   *      1. Atualiza repasse → ACEITO + receptor
   *      2. Atualiza escala → mat + dados do receptor
   */
  async aceitar(
    repasseId: number,
    usuarioLogado: { id: number; mat: string; typeUser: number },
  ): Promise<ReturnRepasseDto> {
    // ─── Busca dados em paralelo: repasse + dados do receptor ─────────────────
    const [repasse, receptor, sgpReceptor] = await Promise.all([
      this.repo.findOne({
        where: { id: repasseId },
        relations: {
          escala: { operacao: { evento: { ome: true } } },
          ofertante: true,
        },
      }),

      this.userRepo.findOne({
        where: { id: usuarioLogado.id },
        relations: { ome: true, conta: true },
      }),

      // ✅ busca sgp pelo mat do usuário logado (precisamos do tipo_escala real)
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

    // ─── Repasse ainda está aberto? ───────────────────────────────────────────
    if (repasse.statusRepasse !== StatusRepasse.ABERTO) {
      throw new BadRequestException(
        `Este repasse não está mais disponível (status: ${repasse.statusRepasse})`,
      );
    }

    // ─── Receptor ≠ ofertante ─────────────────────────────────────────────────
    if (repasse.ofertante.id === usuarioLogado.id) {
      throw new ForbiddenException('Você não pode aceitar seu próprio repasse');
    }

    // ─── Evento ainda editável? ───────────────────────────────────────────────
    const statusEvento = repasse.escala?.operacao?.evento?.status_evento;
    if (statusEvento !== 'CRIADO') {
      throw new ForbiddenException(
        `Não é possível aceitar. O evento está ${statusEvento}`,
      );
    }

    // ─── Mesmo OME? ───────────────────────────────────────────────────────────
    if (receptor.ome.id !== repasse.escala?.operacao?.evento?.ome?.id) {
      throw new ForbiddenException(
        'Você só pode aceitar repasses de eventos da sua OME',
      );
    }

    // ─── tipo_escala deve bater ───────────────────────────────────────────────
    const tipoReceptor = sgpReceptor?.tipoSgp ?? 'P';
    if (tipoReceptor !== repasse.tipoEscalaRepasse) {
      throw new ForbiddenException(
        `Tipo incompatível: você é "${tipoReceptor}" e o serviço é para "${repasse.tipoEscalaRepasse}"`,
      );
    }

    // ─── Receptor já está escalado no mesmo dia + mesmo sistema? ─────────────
    // ✅ Usa o índice IDX_escala_mat_data_sistema (unique) para resolver em O(1)
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

    // ─── Transação atômica ────────────────────────────────────────────────────
    await this.dataSource.transaction(async (manager) => {
      // 1. Atualiza o repasse
      await manager.update(RepasseEntity, repasseId, {
        statusRepasse: StatusRepasse.ACEITO,
        receptor: { id: usuarioLogado.id },
      });

      // 2. Atualiza a escala com os dados do receptor
      await manager.update(EscalaEntity, repasse.escala.id, {
        usuario: { id: usuarioLogado.id },
        // ─── Snapshot dos dados SGP do receptor no momento do aceite ───
        pg_escala: sgpReceptor?.pgSgp ?? '',
        mat_escala: sgpReceptor?.matSgp ?? usuarioLogado.mat,
        ng_escala: sgpReceptor?.nomeGuerraSgp ?? '',
        tipo_escala: sgpReceptor?.tipoSgp ?? '',
        cpf_escala: sgpReceptor?.cpfSgp ?? '',
        nomecompleto_escala: sgpReceptor?.nomeCompletoSgp ?? '', // ← precisa adicionar ao select
        nomeome_escala: receptor.ome?.nomeOme ?? '',
        nunfunc_escala: sgpReceptor?.nunfuncSgp ?? '', // ← precisa adicionar ao select
        nunvinc_escala: sgpReceptor?.nunvincSgp ?? '', // ← precisa adicionar ao select
        situacao: sgpReceptor?.situacaoSgp ?? 'REGULAR', // ← precisa adicionar ao select
        // ─── Conta e flags ──────────────────────────────────────────────
        conta: receptor.conta ? { id: receptor.conta.id } : () => 'NULL',
        isRepasse: true,
        repasseOrigemId: repasseId,
      });
    });

    return this.findOne(repasseId);
  }

  // ─── CANCELAR REPASSE (pelo ofertante) ──────────────────────────────────────
  /**
   * O próprio ofertante desiste de repassar antes que alguém aceite.
   */
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

  // ─── LISTAR REPASSES ABERTOS (disponíveis para o usuário logado) ────────────
  /**
   * Retorna apenas repasses ABERTOS compatíveis com o tipo_escala do receptor,
   * excluindo os que o próprio usuário ofertou e os dias em que já está escalado.
   *
   * ✅ Performático: filtra direto no banco com subquery EXISTS,
   *    evitando trazer dados desnecessários para o Node.
   */
  async findAbertosParaMim(
    usuarioLogado: { id: number; mat: string; omeId: number },
    tipoEscalaJwt?: string, // opcional — pode vir undefined do JWT
  ): Promise<ReturnRepasseDto[]> {
    // ✅ Se não vier no JWT, busca direto no SGP pelo mat do usuário
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
      .where('r.status_repasse = :status', { status: StatusRepasse.ABERTO })
      .andWhere('r.tipo_escala_repasse = :tipo', { tipo: tipoEscala })
      .andWhere('r.ofertante_id != :userId', { userId: usuarioLogado.id })
      .andWhere('evento.ome_id = :omeId', { omeId: usuarioLogado.omeId })
      .andWhere(
        `NOT EXISTS (
    SELECT 1 FROM escala e
    WHERE e.mat_escala = :mat
      AND e.data_inicio = r.data_inicio_repasse
      AND e.sistema = r.sistema_repasse::escala_sistema_enum
  )`,
        { mat: usuarioLogado.mat },
      )
      .orderBy('r.created_at', 'DESC') // Changed to most recent first
      .getMany();

    // Fetch SGP data for each repasse
    const dtos = await Promise.all(
      repasses.map(async (r) => {
        const sgpOfertante = await this.dadosSgpRepo
          .createQueryBuilder('sgp')
          .select(['sgp.pgSgp', 'sgp.nomeGuerraSgp', 'sgp.situacaoSgp'])
          .where('sgp.matSgp = :mat', { mat: r.matOfertante })
          .getOne();

        return new ReturnRepasseDto(r, sgpOfertante, null); // receptor is null for open repasses
      }),
    );

    return dtos;
  }

  // ─── LISTAR MEUS REPASSES (ofertados por mim) ───────────────────────────────
  async findMeusRepasses(usuarioLogado: {
    id: number;
  }): Promise<ReturnRepasseDto[]> {
    const repasses = await this.repo.find({
      where: { ofertante: { id: usuarioLogado.id } },
      relations: {
        escala: { operacao: { evento: { ome: true } } },
        ofertante: true,
        receptor: true,
      },
      order: { createdAt: 'DESC' },
    });

    // Fetch SGP data for each repasse
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

  // ─── FIND ONE ────────────────────────────────────────────────────────────────
  async findOne(id: number): Promise<ReturnRepasseDto> {
    const repasse = await this.repo.findOne({
      where: { id },
      relations: {
        escala: { operacao: { evento: { ome: true } } },
        ofertante: true,
        receptor: true,
      },
    });
    if (!repasse) throw new NotFoundException('Repasse não encontrado');

    // Fetch SGP data for ofertante
    const sgpOfertante = await this.dadosSgpRepo
      .createQueryBuilder('sgp')
      .select(['sgp.pgSgp', 'sgp.nomeGuerraSgp', 'sgp.situacaoSgp'])
      .where('sgp.matSgp = :mat', { mat: repasse.matOfertante })
      .getOne();

    // Fetch SGP data for receptor if exists
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

  // ─── LISTAR TODOS ────────────────────────────────────────────────────────────
  async findAll(): Promise<ReturnRepasseDto[]> {
    const repasses = await this.repo.find({
      relations: {
        escala: { operacao: { evento: { ome: true } } },
        ofertante: true,
        receptor: true,
      },
      order: { createdAt: 'DESC' }, // Most recent first
    });

    // Fetch SGP data for each repasse
    const dtos = await Promise.all(
      repasses.map(async (r) => {
        const sgpOfertante = await this.dadosSgpRepo
          .createQueryBuilder('sgp')
          .select(['sgp.pgSgp', 'sgp.nomeGuerraSgp', 'sgp.situacaoSgp'])
          .where('sgp.matSgp = :mat', { mat: r.matOfertante })
          .getOne();

        console.log(
          `Buscando SGP para mat ${r.matOfertante} (findAll):`,
          sgpOfertante,
        );

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

  // ─── JOB: Expirar repasses não aceitos ──────────────────────────────────────
  /**
   * Roda a cada minuto.
   * Marca como CANCELADO qualquer repasse ABERTO cuja data+hora de início
   * já passou — ou seja, o serviço já começou e ninguém pegou.
   *
   * ✅ UPDATE direto no banco — zero overhead de memória.
   * ✅ Compara (data_inicio_repasse + hora_inicio_repasse) com NOW() do Postgres.
   */
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
