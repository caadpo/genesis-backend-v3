import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

export class SeedInicialDiretoriasOmesUser1775481824057 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 🔹 1) DIRETORIAS
    await queryRunner.query(`
      INSERT INTO diretoria (nomediretoria)
      VALUES
      ('DPO'),
      ('DIM'),
      ('DIRESP'),
      ('DINTER I'),
      ('DINTER II');
    `);

    // 🔹 2) OMEs (usando ids das diretorias na ordem inserida)
    await queryRunner.query(`
      INSERT INTO ome (nomeome, diretoriaid)
      VALUES
      ('CPA_DPO', 1),
      ('1º BPM', 2),
      ('BPCHOQUE', 3),
      ('4º BPM', 4),
      ('5º BPM', 5);
    `);

    // 🔹 3) USER MASTER
    const hashedPassword = await bcrypt.hash('genesis', 10);

    await queryRunner.query(
      `
      INSERT INTO "user"
      (loginsei, password, type_user, pg, mat, ng, tipo, phone, imagem_url, cpf, nunfunc, nunvinc, omeid)
      VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      `,
      [
        'emerson.francisco1',
        hashedPassword,
        10,
        'CB',
        1157590,
        'FRANCISCO',
        'P',
        '(81)98685-4814',
        '/1157590.png',
        '08286667417',
        '3392503',
        '1',
        1,
      ],
    );

    // 🔹 4) TETOS INICIAIS (PJES - ABRIL/2026)
    await queryRunner.query(`
INSERT INTO tetos
(
  imagem_url,
  sistema,
  nome_verba,
  cod_verba,
  valor_total,
  ttctof,
  ttctprc,
  data_inicio,
  data_fim,
  tipo_periodo
)
VALUES
(
  '/logo_dpo.png',
  'PJES',
  'GOVERNO',
  '247',
  50000.00,
  100,
  100,
  '2026-04-01',
  '2026-04-30',
  'MENSAL'
),
(
  '/pe_logo.png',
  'PJES',
  'P ESCOLAR',
  '263',
  250000.00,
  500,
  500,
  '2026-04-01',
  '2026-04-30',
  'MENSAL'
),
(
  '/mobi_logo.png',
  'PJES',
  'CTM BRT',
  '255',
  50000.00,
  100,
  100,
  '2026-04-01',
  '2026-04-30',
  'MENSAL'
),
(
  '/brasil_logo.png',
  'PJES',
  'FEDERAL',
  '250',
  12500.00,
  25,
  25,
  '2026-04-01',
  '2026-04-30',
  'MENSAL'
),
(
  '/alepe_logo.png',
  'PJES',
  'ALEPE',
  '270',
  5000.00,
  10,
  10,
  '2026-04-01',
  '2026-04-30',
  'MENSAL'
),
(
  '/tjpe_logo.png',
  'PJES',
  'TJPE',
  '290',
  25000.00,
  50,
  50,
  '2026-04-01',
  '2026-04-30',
  'MENSAL'
),
(
  '/sds_logo.png',
  'PJES',
  'SDS',
  '299',
  100000.00,
  200,
  200,
  '2026-04-01',
  '2026-04-30',
  'MENSAL'
);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "user" WHERE loginsei = 'emerson.francisco1'`,
    );
    await queryRunner.query(`DELETE FROM ome`);
    await queryRunner.query(`DELETE FROM diretoria`);
    await queryRunner.query(`
  DELETE FROM tetos
  WHERE data_inicio = '2026-04-01'
  AND sistema = 'PJES';
`);
  }
}
