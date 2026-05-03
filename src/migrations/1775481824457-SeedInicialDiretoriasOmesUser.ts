import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

export class SeedInicialDiretoriasOmesUser1775481824457 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    /**
     * 🔥 LIMPEZA TOTAL (idempotente para DEV)
     */
    await queryRunner.query(`DELETE FROM distribuicao;`);
    await queryRunner.query(`DELETE FROM tetos;`);
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
     * 🔹 OMEs (SEM ID FIXO — buscando pelo nome da diretoria)
     */
    await queryRunner.query(`
      INSERT INTO ome (nomeome, diretoriaid)
      SELECT 'CPA_DPO', id FROM diretoria WHERE nomediretoria = 'DPO'
      UNION ALL
      SELECT '1º BPM', id FROM diretoria WHERE nomediretoria = 'DIM'
      UNION ALL
      SELECT 'BPCHOQUE', id FROM diretoria WHERE nomediretoria = 'DIRESP'
      UNION ALL
      SELECT '4º BPM', id FROM diretoria WHERE nomediretoria = 'DINTER I'
      UNION ALL
      SELECT '5º BPM', id FROM diretoria WHERE nomediretoria = 'DINTER II';
    `);

    /**
     * 🔹 USER MASTER
     */
    const hashedPassword = await bcrypt.hash('genesis', 10);

    await queryRunner.query(
      `
      INSERT INTO "user"
      (loginsei, password, type_user, pg, mat, ng, tipo, phone, imagem_url, cpf, nunfunc, nunvinc, omeid)
      SELECT
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, id
      FROM ome
      WHERE nomeome = 'CPA_DPO';
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
      ],
    );

    /**
     * 🔥 PJES — MENSAL (ABRIL/2026)
     */
    await queryRunner.query(`
      INSERT INTO tetos
      (imagem_url, sistema, nome_verba, cod_verba, valor_total,
       ttctof, ttctprc, data_inicio, data_fim, tipo_periodo, status)
      VALUES
      ('/logo_dpo.png','PJES','GOVERNO','247',50000,100,100,'2026-04-01','2026-04-30','MENSAL','ABERTO'),
      ('/pe_logo.png','PJES','P ESCOLAR','263',250000,500,500,'2026-04-01','2026-04-30','MENSAL','ABERTO'),
      ('/mobi_logo.png','PJES','CTM BRT','255',50000,100,100,'2026-04-01','2026-04-30','MENSAL','ABERTO'),
      ('/brasil_logo.png','PJES','FEDERAL','250',12500,25,25,'2026-04-01','2026-04-30','MENSAL','ABERTO'),
      ('/alepe_logo.png','PJES','ALEPE','270',5000,10,10,'2026-04-01','2026-04-30','MENSAL','ABERTO'),
      ('/tjpe_logo.png','PJES','TJPE','290',25000,50,50,'2026-04-01','2026-04-30','MENSAL','ABERTO'),
      ('/sds_logo.png','PJES','SDS','299',100000,200,200,'2026-04-01','2026-04-30','MENSAL','ABERTO');
    `);

    /**
     * 🔥 DIÁRIAS — OPERAÇÕES EM ANDAMENTO (espelho PJES)
     */
    await queryRunner.query(`
      INSERT INTO tetos
      (imagem_url, sistema, nome_verba, cod_verba, valor_total,
       ttctof, ttctprc, data_inicio, data_fim, tipo_periodo, status)
      VALUES
      ('/logo_dpo.png','DIARIAS','GOVERNO DIÁRIAS','D247',50000,100,100,'2026-01-01',NULL,'OPERACAO','ABERTO'),
      ('/pe_logo.png','DIARIAS','P ESCOLAR DIÁRIAS','D263',250000,500,500,'2026-01-01',NULL,'OPERACAO','ABERTO'),
      ('/mobi_logo.png','DIARIAS','CTM BRT DIÁRIAS','D255',50000,100,100,'2026-01-01',NULL,'OPERACAO','ABERTO'),
      ('/brasil_logo.png','DIARIAS','FEDERAL DIÁRIAS','D250',12500,25,25,'2026-01-01',NULL,'OPERACAO','ABERTO'),
      ('/alepe_logo.png','DIARIAS','ALEPE DIÁRIAS','D270',5000,10,10,'2026-01-01',NULL,'OPERACAO','ABERTO'),
      ('/tjpe_logo.png','DIARIAS','TJPE DIÁRIAS','D290',25000,50,50,'2026-01-01',NULL,'OPERACAO','ABERTO'),
      ('/sds_logo.png','DIARIAS','SDS DIÁRIAS','D299',100000,200,200,'2026-01-01',NULL,'OPERACAO','ABERTO');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM distribuicao;`);
    await queryRunner.query(`DELETE FROM tetos;`);
    await queryRunner.query(
      `DELETE FROM "user" WHERE loginsei = 'emerson.francisco1';`,
    );
    await queryRunner.query(`DELETE FROM ome;`);
    await queryRunner.query(`DELETE FROM diretoria;`);
  }
}
