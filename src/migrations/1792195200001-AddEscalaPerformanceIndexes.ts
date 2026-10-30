import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEscalaPerformanceIndexes1792195200001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // /escala/minhas (filtro por usuário + mês)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_escala_usuario_data"
      ON "escala" ("usuario_id", "data_inicio")
    `);

    // /escala/:id/colegas (mesma operação, data e horário)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_escala_operacao_data_hora"
      ON "escala" ("operacao_id", "data_inicio", "hora_inicio", "hora_fim")
    `);

    // Os simples antigos ficam redundantes (o composto cobre o prefixo)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_escala_usuario_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_escala_operacao_id"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_escala_usuario_id"
      ON "escala" ("usuario_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_escala_operacao_id"
      ON "escala" ("operacao_id")
    `);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_escala_operacao_data_hora"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_escala_usuario_data"`);
  }
}
