import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRepassePerformanceIndexes1792195200002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // /repasse/meus (e ?status=ABERTO): por ofertante + status, mais recentes primeiro
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_repasse_ofertante_status_created"
      ON "repasse" ("ofertante_id", "status_repasse", "created_at" DESC)
    `);

    // /repasse/disponiveis, count e o cron de expiração: só os ABERTOS
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_repasse_abertos_data"
      ON "repasse" ("tipo_escala_repasse", "data_inicio_repasse")
      WHERE "status_repasse" = 'ABERTO'
    `);

    // findAll: ordenação por created_at
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_repasse_created_at"
      ON "repasse" ("created_at" DESC)
    `);

    // ofertante_id sozinho fica redundante (o composto cobre o prefixo)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_repasse_ofertante_id"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_repasse_ofertante_id"
      ON "repasse" ("ofertante_id")
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_repasse_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_repasse_abertos_data"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_repasse_ofertante_status_created"`,
    );
  }
}
