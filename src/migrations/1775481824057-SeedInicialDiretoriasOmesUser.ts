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
    const hashedPassword = await bcrypt.hash('abc', 10);

    await queryRunner.query(
      `
      INSERT INTO "user"
      (loginsei, password, type_user, pg, mat, ng, tipo, funcao, phone, imagem_url, omeid)
      VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      `,
      [
        'emerson.francisco1',
        hashedPassword,
        10,
        'Cb',
        1157590,
        'Francisco',
        'P',
        'Sargenteante',
        '(81)98685-4814',
        '/1157590.png',
        1,
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "user" WHERE loginsei = 'emerson.francisco1'`,
    );
    await queryRunner.query(`DELETE FROM ome`);
    await queryRunner.query(`DELETE FROM diretoria`);
  }
}
