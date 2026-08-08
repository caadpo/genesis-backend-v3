import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sistema, Teto } from './entities/teto.entity';
import { StatusTeto } from './enum/teto-type.enum';
import { EscalaEntity } from 'src/escala/entities/escala.entity';
import { ReturnTetoDto } from './dtos/return-teto.dto';

import ExcelJS from 'exceljs';
import path from 'path/win32';

@Injectable()
export class TetoService {
  constructor(
    @InjectRepository(Teto)
    private readonly tetoRepository: Repository<Teto>,
    @InjectRepository(EscalaEntity)
    private readonly escalaRepo: Repository<EscalaEntity>,
  ) {}

  // 🔥 Mapper obrigatório quando usa Next como proxy
  private toJSON(t: Teto) {
    return {
      id: t.id,
      imagemUrl: t.imagemUrl,
      sistema: t.sistema,
      nome_verba: t.nome_verba,
      cod_verba: t.cod_verba,
      valor_total: Number(t.valor_total),
      ttctof: t.ttctof,
      ttctprc: t.ttctprc,
      data_inicio: t.data_inicio,
      data_fim: t.data_fim,
      tipo_periodo: t.tipo_periodo,
      status: t.status,
      data_prestacao_contas: t.data_prestacao_contas ?? null,
      created_at: t.created_at,
      updated_at: t.updated_at,
    };
  }

  private mapRawTeto(raw: any): ReturnTetoDto {
    const base = {
      id: raw.id,
      imagemUrl: raw.imagemUrl,
      sistema: raw.sistema,
      nome_verba: raw.nome_verba,
      cod_verba: raw.cod_verba,
      valor_total: Number(raw.valor_total),
      ttctof: Number(raw.ttctof),
      ttctprc: Number(raw.ttctprc),
      data_inicio: raw.data_inicio,
      data_fim: raw.data_fim,
      tipo_periodo: raw.tipo_periodo,
      status: raw.status,
      data_prestacao_contas: raw.data_prestacao_contas ?? null,
      created_at: raw.created_at,
      updated_at: raw.updated_at,
    };

    const qtd_dist_of = Number(raw.qtd_dist_of ?? 0);
    const qtd_dist_prc = Number(raw.qtd_dist_prc ?? 0);
    const totalCotasOficiais = Number(raw.totalCotasOficiais ?? 0);
    const totalCotasPracas = Number(raw.totalCotasPracas ?? 0);

    return {
      ...base,
      qtd_dist_of,
      qtd_dist_prc,
      saldo_of: Number(base.ttctof) - qtd_dist_of,
      saldo_prc: Number(base.ttctprc) - qtd_dist_prc,
      totalCotasOficiais,
      totalCotasPracas,
    };
  }

  private buildTetoQuery() {
    return (
      this.tetoRepository
        .createQueryBuilder('t')
        .select('t.id', 'id')
        .addSelect('t.imagem_url', 'imagemUrl')
        .addSelect('t.sistema', 'sistema')
        .addSelect('t.nome_verba', 'nome_verba')
        .addSelect('t.cod_verba', 'cod_verba')
        .addSelect('t.valor_total', 'valor_total')
        .addSelect('t.ttctof', 'ttctof')
        .addSelect('t.ttctprc', 'ttctprc')
        .addSelect('t.data_inicio', 'data_inicio')
        .addSelect('t.data_fim', 'data_fim')
        .addSelect('t.tipo_periodo', 'tipo_periodo')
        .addSelect('t.status', 'status')
        .addSelect('t.data_prestacao_contas', 'data_prestacao_contas')
        .addSelect('t.created_at', 'created_at')
        .addSelect('t.updated_at', 'updated_at')

        // ✅ NOVO: soma das distribuições do teto
        .addSelect(
          (subQuery) =>
            subQuery
              .select('COALESCE(SUM(d.qtd_dist_of), 0)')
              .from('distribuicao', 'd')
              .where('d.teto_id = t.id'),
          'qtd_dist_of',
        )
        .addSelect(
          (subQuery) =>
            subQuery
              .select('COALESCE(SUM(d.qtd_dist_prc), 0)')
              .from('distribuicao', 'd')
              .where('d.teto_id = t.id'),
          'qtd_dist_prc',
        )

        // já existia: cotas das escalas
        .addSelect(
          (subQuery) =>
            subQuery
              .select('COALESCE(SUM(e.cota_escala), 0)')
              .from(EscalaEntity, 'e')
              .innerJoin('e.operacao', 'op')
              .innerJoin('op.evento', 'ev')
              .innerJoin('ev.distribuicao', 'd')
              .where('e.tipo_escala = :tipoOf', { tipoOf: 'O' })
              .andWhere('d.teto_id = t.id'),
          'totalCotasOficiais',
        )
        .addSelect(
          (subQuery) =>
            subQuery
              .select('COALESCE(SUM(e.cota_escala), 0)')
              .from(EscalaEntity, 'e')
              .innerJoin('e.operacao', 'op')
              .innerJoin('op.evento', 'ev')
              .innerJoin('ev.distribuicao', 'd')
              .where('e.tipo_escala = :tipoPrc', { tipoPrc: 'P' })
              .andWhere('d.teto_id = t.id'),
          'totalCotasPracas',
        )
    );
  }

  async gerarXlsEscalas(
    tetoId: number,
  ): Promise<{ buffer: Buffer; nomeArquivo: string }> {
    const teto = await this.tetoRepository.findOne({ where: { id: tetoId } });
    if (!teto) throw new NotFoundException('Teto não encontrado');

    const nomeArquivo = `${teto.nome_verba}_${teto.cod_verba}`.replace(
      /[^a-zA-Z0-9_\-]/g,
      '_',
    );

    const escalas = await this.escalaRepo
      .createQueryBuilder('e')
      .innerJoin('e.operacao', 'op')
      .innerJoin('op.evento', 'ev')
      .innerJoin('ev.ome', 'ome')
      .innerJoin('ev.distribuicao', 'dist')
      .innerJoin('dist.teto', 't')
      .select([
        't.nome_verba               AS "OPERATIVA"',
        'ome.nomeOme                AS "UNIDADE"',
        'e.nunvinc_escala           AS "NUMVINC"',
        'e.nunfunc_escala           AS "NUMFUNC"',
        'e.data_inicio              AS "DATA INÍCIO"',
        'e.data_inicio              AS "DATA TERMINO"',
        'e.cota_escala              AS "QDT COTA"',
        't.cod_verba                AS "COD"',
        't.nome_verba               AS "TITULO"',
        'e.pg_escala                AS "PG"',
        'e.mat_escala               AS "MATRICULA"',
        'e.nomecompleto_escala      AS "NOME COMPLETO"',
        'e.tipo_escala              AS "TIPO"',
        'e.nomeome_escala           AS "OME"',
        'e.situacao                 AS "SITUAÇÃO"',
      ])
      .where('t.id = :tetoId', { tetoId })
      .orderBy('ome.nomeOme', 'ASC')
      .addOrderBy('e.nomecompleto_escala', 'ASC')
      .getRawMany();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Prestação de Contas');
    sheet.views = [{ showGridLines: false }];

    const totalCols = 16; // 1 (#) + 12 colunas de dados

    // ─── Linha 1: logos + cabeçalho institucional ────────────────────────────
    sheet.addRow([]); // row 1
    sheet.addRow([]); // row 2
    sheet.addRow([]); // row 3

    // Título institucional centralizado (colunas 1 a totalCols-1)
    sheet.mergeCells(1, 2, 3, totalCols - 1);
    const titleCell = sheet.getCell(1, 2);
    titleCell.value =
      'POLÍCIA MILITAR DE PERNAMBUCO\nQUARTEL DO COMANDO GERAL\nDIRETORIA DE PLANEJAMENTO OPERACIONAL';
    titleCell.font = { name: 'Arial', bold: true, size: 11 };
    titleCell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    };

    // ─── Linha 4: subtítulo ──────────────────────────────────────────────────
    sheet.addRow([]); // row 4
    sheet.mergeCells(4, 1, 4, totalCols);
    const subtitleCell = sheet.getCell(4, 1);
    subtitleCell.value = `PLANILHA DE PRESTAÇÃO DE CONTAS - ${teto.nome_verba}`;
    subtitleCell.font = { name: 'Arial', bold: true, size: 10 };
    subtitleCell.alignment = { horizontal: 'left', vertical: 'middle' };
    sheet.getRow(4).height = 22;

    // ─── Linha 5: cabeçalho da tabela ────────────────────────────────────────
    const headers = [
      '#',
      'OPERATIVA',
      'UNIDADE',
      'NUMVINC',
      'NUMFUNC',
      'DATA INÍCIO',
      'DATA TERMINO',
      'QDT COTA',
      'COD',
      'TITULO',
      'PG',
      'MATRICULA',
      'NOME COMPLETO',
      'TIPO',
      'OME',
      'SITUAÇÃO',
    ];

    const headerRow = sheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = {
        name: 'Arial',
        bold: true,
        color: { argb: 'FFFFFFFF' },
        size: 9,
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0A756C' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    headerRow.height = 20;

    // ─── Dados ───────────────────────────────────────────────────────────────
    if (escalas.length === 0) {
      const emptyRow = sheet.addRow([
        'Nenhuma escala encontrada para este teto',
      ]);
      sheet.mergeCells(emptyRow.number, 1, emptyRow.number, totalCols);
      emptyRow.getCell(1).alignment = { horizontal: 'center' };
    } else {
      escalas.forEach((escala, index) => {
        const row = sheet.addRow([
          index + 1,
          escala['OPERATIVA'],
          escala['UNIDADE'],
          escala['NUMVINC'],
          escala['NUMFUNC'],
          escala['DATA INÍCIO'],
          escala['DATA TERMINO'],
          escala['QDT COTA'],
          escala['COD'],
          escala['TITULO'],
          escala['PG'],
          escala['MATRICULA'],
          escala['NOME COMPLETO'],
          escala['TIPO'],
          escala['OME'],
          escala['SITUAÇÃO'],
        ]);

        const isEven = index % 2 === 0;
        row.eachCell((cell) => {
          cell.font = { name: 'Arial', size: 9 };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF5F5F5' },
          };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          };
        });
        row.height = 16;
      });
    }

    // ─── Auto-largura baseada no conteúdo ────────────────────────────────────
    const colWidths = headers.map((h) => h.length);
    sheet.columns.forEach((col, i) => {
      let maxLen = headers[i]?.length ?? 10;

      sheet.eachRow((row, rowNum) => {
        if (rowNum <= 4) return; // pula cabeçalho institucional e subtítulo
        const cell = row.getCell(i + 1);
        const val = cell.value ? String(cell.value) : '';
        if (val.length > maxLen) maxLen = val.length;
      });

      col.width = Math.min(Math.max(maxLen + 2, 8), 45);
    });

    sheet.columns.forEach((col, i) => {
      col.width = Math.min(Math.max(colWidths[i] + 3, 8), 40);
    });

    // Altura das linhas do cabeçalho institucional
    sheet.getRow(1).height = 30;
    sheet.getRow(2).height = 30;
    sheet.getRow(3).height = 30;
    sheet.getRow(4).height = 22;

    const buffer = await workbook.xlsx.writeBuffer();
    return { buffer: Buffer.from(buffer), nomeArquivo };
  }

  async create(dados: Partial<Teto>) {
    const teto = this.tetoRepository.create(dados);
    const saved = await this.tetoRepository.save(teto);
    return this.toJSON(saved);
  }

  // 🔵 PJES → depende de mês/ano e status
  async findPjesPorMes(mes: number, ano: number): Promise<ReturnTetoDto[]> {
    const inicioMes = new Date(ano, mes - 1, 1);
    const fimMes = new Date(ano, mes, 0);

    const tetos = await this.buildTetoQuery()
      .where('t.sistema = :sistema', { sistema: Sistema.PJES })
      .andWhere(
        `t.data_inicio <= :fimMes
         AND t.data_fim >= :inicioMes`,
        { inicioMes, fimMes },
      )
      .orderBy('t.nome_verba', 'ASC')
      .getRawMany();

    return tetos.map((raw) => this.mapRawTeto(raw));
  }

  // 🟢 DIÁRIAS → NÃO USA DATA, SÓ STATUS
  async findDiarias(status: StatusTeto): Promise<ReturnTetoDto[]> {
    const tetos = await this.buildTetoQuery()
      .where('t.sistema = :sistema', { sistema: Sistema.DIARIAS })
      .andWhere('t.status = :status', { status })
      .orderBy('t.nome_verba', 'ASC')
      .getRawMany();

    return tetos.map((raw) => this.mapRawTeto(raw));
  }

  async findOne(id: number): Promise<ReturnTetoDto> {
    const rawTeto = await this.buildTetoQuery()
      .where('t.id = :id', { id })
      .getRawOne();

    if (!rawTeto) {
      throw new NotFoundException(`Teto com ID ${id} não encontrado`);
    }

    return this.mapRawTeto(rawTeto);
  }

  async update(id: number, dados: Partial<Teto>) {
    await this.tetoRepository.update(id, dados);
    return this.findOne(id);
  }

  async encerrar(id: number) {
    await this.tetoRepository.update(id, {
      status: StatusTeto.ENCERRADO,
    });
    return this.findOne(id);
  }

  async prestarContas(id: number): Promise<ReturnTetoDto> {
    const teto = await this.tetoRepository.findOne({ where: { id } });
    if (!teto) throw new NotFoundException('Teto não encontrado');

    if (teto.data_prestacao_contas) {
      throw new BadRequestException(
        'Este teto já possui prestação de contas registrada.',
      );
    }

    await this.tetoRepository.update(id, {
      data_prestacao_contas: new Date(),
    });

    return this.findOne(id);
  }

  // opcional: permitir desfazer, caso registre por engano
  async desfazerPrestacaoContas(id: number): Promise<ReturnTetoDto> {
    const teto = await this.tetoRepository.findOne({ where: { id } });
    if (!teto) throw new NotFoundException('Teto não encontrado');

    await this.tetoRepository.update(id, {
      data_prestacao_contas: null,
    });

    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.tetoRepository.delete(id);
  }
}
