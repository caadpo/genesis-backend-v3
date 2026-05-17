import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

export class SeedInicialDiretoriasOmesUser1775481824457 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    /**
     * 🔥 LIMPEZA TOTAL (idempotente para DEV)
     */
    await queryRunner.query(`DELETE FROM distribuicao;`);
    await queryRunner.query(`DELETE FROM tetos;`);
    await queryRunner.query(`DELETE FROM dadossgp;`);
    await queryRunner.query(`DELETE FROM "user";`);
    await queryRunner.query(`DELETE FROM ome;`);
    await queryRunner.query(`DELETE FROM diretoria;`);

    /**
     * 🔹 DIRETORIAS
     */
    await queryRunner.query(`
      INSERT INTO diretoria (nomediretoria)
      VALUES
        ('DPO'),
        ('DIM'),
        ('DIRESP'),
        ('DINTER I'),
        ('DINTER II');
    `);

    /**
     * 🔹 OMEs
     */
    await queryRunner.query(`
      INSERT INTO ome (nomeome, diretoriaid)
      SELECT 'DPO SEDE',  id FROM diretoria WHERE nomediretoria = 'DPO'
      UNION ALL
      SELECT '1º BPM',   id FROM diretoria WHERE nomediretoria = 'DIM'
      UNION ALL
      SELECT 'BPCHOQUE', id FROM diretoria WHERE nomediretoria = 'DIRESP'
      UNION ALL
      SELECT '4º BPM',   id FROM diretoria WHERE nomediretoria = 'DINTER I'
      UNION ALL
      SELECT '5º BPM',   id FROM diretoria WHERE nomediretoria = 'DINTER II';
    `);

    /**
     * 🔹 USER MASTER
     * ✅ sem pg, ng, tipo, cpf, nunfunc, nunvinc — esses campos não existem mais na tabela user
     */
    const hashedPassword = await bcrypt.hash('genesis', 10);

    await queryRunner.query(
      `
      INSERT INTO "user" (mat, password, type_user, phone, imagem_url, omeid)
      SELECT $1, $2, $3, $4, $5, id
      FROM ome
      WHERE nomeome = 'DPO SEDE';
      `,
      ['1157590', hashedPassword, 10, '(81)98685-4814', '/1157590.png'],
    );

    /**
     * 🔹 DADOS SGP — registros iniciais para os usuários seed
     * ✅ campos pessoais agora vivem aqui, não no user
     */
    await queryRunner.query(`
      INSERT INTO dadossgp
        (matsgp, pgsgp, ngsgp, nomecompletosgp, omesgp, tiposgp,
         cpfsgp, nunfuncsgp, nunvincsgp, localapresentacaosgp, situacaosgp)
      VALUES
        ('1157590', 'CB', 'FRANCISCO', 'FRANCISCO SILVA SANTOS',
         'DPO SEDE', 'P', '08286667417', '3392503', '1',
         'SEDE DA OME', 'REGULAR'),

        ('1000001', 'CAP', 'OLIVEIRA', 'CARLOS OLIVEIRA MELO',
         '1º BPM', 'O', '11122233344', '1000001', '2',
         'SEDE DA OME', 'REGULAR'),

        ('1000002', '1º TEN', 'SANTOS', 'ANA SANTOS FERREIRA',
         '1º BPM', 'O', '22233344455', '1000002', '3',
         'SEDE DA OME', 'REGULAR'),

        ('1000003', '2º SGT', 'COSTA', 'PEDRO COSTA LIMA',
         'BPCHOQUE', 'P', '33344455566', '1000003', '4',
         'SEDE DA OME', 'REGULAR'),

        ('1000004', '1º SGT', 'ALVES', 'MARIA ALVES ROCHA',
         'BPCHOQUE', 'P', '44455566677', '1000004', '5',
         'SEDE DA OME', 'REGULAR'),

        ('1000005', 'TC', 'FERREIRA', 'JOSE FERREIRA NETO',
         '4º BPM', 'O', '55566677788', '1000005', '6',
         'SEDE DA OME', 'REGULAR'),

        ('1000006', 'SD', 'LIMA', 'LUCAS LIMA BARROS',
         '5º BPM', 'P', '66677788899', '1000006', '7',
         'SEDE DA OME', 'REGULAR');
    `);

    /**
     * 🔥 PJES — MENSAL (ABRIL/2026)
     */
    await queryRunner.query(`
      INSERT INTO tetos
        (imagem_url, sistema, nome_verba, cod_verba, valor_total,
         ttctof, ttctprc, data_inicio, data_fim, tipo_periodo, status)
      VALUES
        ('/logo_dpo.png',    'PJES','GOVERNO',   '247', 50000,  100, 100, '2026-05-01','2026-05-30','MENSAL','ABERTO'),
        ('/pe_logo.png',     'PJES','P ESCOLAR', '263', 250000, 500, 500, '2026-05-01','2026-05-30','MENSAL','ABERTO'),
        ('/mobi_logo.png',   'PJES','CTM BRT',   '255', 50000,  100, 100, '2026-05-01','2026-05-30','MENSAL','ABERTO'),
        ('/brasil_logo.png', 'PJES','FEDERAL',   '250', 12500,   25,  25, '2026-05-01','2026-05-30','MENSAL','ABERTO'),
        ('/alepe_logo.png',  'PJES','ALEPE',     '270', 5000,    10,  10, '2026-05-01','2026-05-30','MENSAL','ABERTO'),
        ('/tjpe_logo.png',   'PJES','TJPE',      '290', 25000,   50,  50, '2026-05-01','2026-05-30','MENSAL','ABERTO'),
        ('/sds_logo.png',    'PJES','SDS',       '299', 100000, 200, 200, '2026-05-01','2026-05-30','MENSAL','ABERTO');
    `);

    /**
     * 🔥 DIÁRIAS — OPERAÇÕES EM ANDAMENTO
     */
    await queryRunner.query(`
      INSERT INTO tetos
        (imagem_url, sistema, nome_verba, cod_verba, valor_total,
         ttctof, ttctprc, data_inicio, data_fim, tipo_periodo, status)
      VALUES
        ('/logo_dpo.png',    'DIARIAS','GOVERNO DIÁRIAS',   'D247', 50000,  100, 100, '2026-05-01', NULL, 'OPERACAO','ABERTO'),
        ('/pe_logo.png',     'DIARIAS','P ESCOLAR DIÁRIAS', 'D263', 250000, 500, 500, '2026-05-01', NULL, 'OPERACAO','ABERTO'),
        ('/mobi_logo.png',   'DIARIAS','CTM BRT DIÁRIAS',   'D255', 50000,  100, 100, '2026-05-01', NULL, 'OPERACAO','ABERTO'),
        ('/brasil_logo.png', 'DIARIAS','FEDERAL DIÁRIAS',   'D250', 12500,   25,  25, '2026-05-01', NULL, 'OPERACAO','ABERTO'),
        ('/alepe_logo.png',  'DIARIAS','ALEPE DIÁRIAS',     'D270', 5000,    10,  10, '2026-05-01', NULL, 'OPERACAO','ABERTO'),
        ('/tjpe_logo.png',   'DIARIAS','TJPE DIÁRIAS',      'D290', 25000,   50,  50, '2026-05-01', NULL, 'OPERACAO','ABERTO'),
        ('/sds_logo.png',    'DIARIAS','SDS DIÁRIAS',       'D299', 100000, 200, 200, '2026-05-01', NULL, 'OPERACAO','ABERTO');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM distribuicao;`);
    await queryRunner.query(`DELETE FROM tetos;`);
    await queryRunner.query(
      `DELETE FROM dadossgp WHERE matsgp IN ('1157590','1000001','1000002','1000003','1000004','1000005','1000006');`,
    );
    await queryRunner.query(`DELETE FROM "user" WHERE mat = '1157590';`);
    await queryRunner.query(`DELETE FROM ome;`);
    await queryRunner.query(`DELETE FROM diretoria;`);
  }
}
