import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateDadossgpTable1775481824160 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'dadossgp',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          { name: 'matsgp', type: 'varchar', isNullable: false },
          { name: 'pgsgp', type: 'varchar', isNullable: false },
          { name: 'nomeguerrasgp', type: 'varchar', isNullable: false },
          { name: 'nomecompletosgp', type: 'varchar', isNullable: false },
          { name: 'nomeomesgp', type: 'varchar', isNullable: true },
          { name: 'tiposgp', type: 'varchar', length: '1', isNullable: false },

          {
            name: 'nunfuncsgp',
            type: 'varchar',
            length: '10',
            isNullable: true,
          },
          {
            name: 'nunvincsgp',
            type: 'varchar',
            length: '10',
            isNullable: true,
          },
          { name: 'cpfsgp', type: 'varchar', length: '11', isNullable: true },
          { name: 'localapresentacaosgp', type: 'varchar', isNullable: true },
          {
            name: 'situacaosgp',
            type: 'varchar',
            isNullable: false,
            default: `'REGULAR'`,
          },
        ],
      }),
      true,
    );

    // ✅ índice ÚNICO para busca por matrícula (join frequente com user)
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_dadossgp_matsgp" ON "dadossgp" ("matsgp")`,
    );

    // ✅ índice para busca por nome de guerra
    await queryRunner.query(
      `CREATE INDEX "IDX_dadossgp_nomeguerrasgp" ON "dadossgp" ("nomeguerrasgp")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dadossgp_matsgp"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_dadossgp_nomeguerrasgp"`,
    );
    await queryRunner.dropTable('dadossgp');
  }
}
