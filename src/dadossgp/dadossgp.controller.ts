import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DadosSgpService } from './dadossgp.service';
import { DadosSgpEntity } from './entities/dadossgp.entity';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { UserType } from 'src/user/enum/user-type.enum';
import { parse } from 'csv-parse/sync';
import { Multer } from 'multer';
import * as iconv from 'iconv-lite';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dados-sgp')
export class DadosSgpController {
  constructor(private readonly dadosSgpService: DadosSgpService) {}

  @Get(':matSgp')
  @Roles(
    UserType.MASTER,
    UserType.TECNICO,
    UserType.AUXILIAR,
    UserType.DIRETOR,
    UserType.ESTRATEGICO,
    UserType.FINANCEIRO,
    UserType.PD,
    UserType.COMUN,
  )
  async getDadosPorMatricula(
    @Param('matSgp') matSgp: string,
  ): Promise<DadosSgpEntity> {
    return this.dadosSgpService.buscarPorMatricula(matSgp);
  }

  // ─── Importação em lote (CSV) ──────────────────────────────────────────────
  @Post('importar')
  @Roles(UserType.MASTER)
  @UseInterceptors(FileInterceptor('file'))
  async importar(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado');

    const conteudo = iconv.decode(file.buffer, 'utf8');

    const primeiraLinha = conteudo.split(/\r?\n/)[0];
    let delimitador = ',';

    if (primeiraLinha.includes('\t')) {
      delimitador = '\t';
    } else if (primeiraLinha.includes(';')) {
      delimitador = ';';
    }

    let linhas: any[];
    try {
      linhas = parse(conteudo, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        delimiter: delimitador,
        bom: true,
      });
    } catch (err) {
      throw new BadRequestException(
        'Erro ao processar o arquivo. Verifique o formato CSV.',
      );
    }

    console.log('Primeira linha:', primeiraLinha);
    console.log('Primeiro registro:', linhas[0]);

    if (!linhas.length) {
      throw new BadRequestException('O arquivo está vazio');
    }

    const registros = linhas.map((linha: any, index: number) => {
      const mat = (linha.matsgp ?? linha.MATSGP ?? '').toString().trim();
      if (!mat) {
        throw new BadRequestException(
          `Linha ${index + 2}: matrícula (matsgp) ausente`,
        );
      }

      return {
        matSgp: mat,
        pgSgp: (linha.pgsgp ?? linha.PGSGP ?? '').trim(),
        nomeGuerraSgp: (
          linha.nomeguerrasgp ??
          linha.NOMEGUERRASGP ??
          ''
        ).trim(),
        nomeOmeSgp: (linha.nomeomesgp ?? linha.NOMEOMESGP ?? '').trim(),
        tipoSgp: (linha.tiposgp ?? linha.TIPOSGP ?? '').trim(),
        nomeCompletoSgp: (
          linha.nomecompletosgp ??
          linha.NOMECOMPLETOSGP ??
          ''
        ).trim(),
        cpfSgp: (linha.cpfsgp ?? linha.CPFSGP ?? '').trim(),
        nunfuncSgp: (linha.nunfuncsgp ?? linha.NUNFUNCSGP ?? '').trim(),
        nunvincSgp: (linha.nunvincsgp ?? linha.NUNVINCSGP ?? '').trim(),
        localApresentacaoSgp: (
          linha.localapresentacaosgp ??
          linha.LOCALAPRESENTACAOSGP ??
          'SEDE DA OME'
        ).trim(),
        situacaoSgp: (
          linha.situacaosgp ??
          linha.SITUACAOSGP ??
          'REGULAR'
        ).trim(),
      };
    });

    return this.dadosSgpService.importarLote(registros);
  }
}
