import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateRepasseTable1775481824605 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'repasse',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },

          { name: 'escala_id', type: 'integer', isNullable: false },
          { name: 'ofertante_id', type: 'integer', isNullable: false },
          { name: 'receptor_id', type: 'integer', isNullable: true },

          {
            name: 'status_repasse',
            type: 'enum',
            enum: ['ABERTO', 'ACEITO', 'CANCELADO'],
            default: `'ABERTO'`,
            isNullable: false,
          },

          // ─── Snapshot para listagem rápida sem joins ───────────────────────
          { name: 'sistema_repasse', type: 'varchar', isNullable: false },
          { name: 'tipo_escala_repasse', type: 'varchar', isNullable: false },
          { name: 'data_inicio_repasse', type: 'date', isNullable: false },
          { name: 'hora_inicio_repasse', type: 'time', isNullable: false },
          { name: 'hora_fim_repasse', type: 'time', isNullable: false },
          { name: 'mat_ofertante', type: 'varchar', isNullable: false },

          { name: 'motivo', type: 'text', isNullable: true },

          { name: 'created_at', type: 'timestamp', default: 'now()' },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );

    // ✅ Garante que a mesma escala não tenha dois repasses ABERTOS simultâneos
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_repasse_escala_aberto"
      ON "repasse" ("escala_id")
      WHERE status_repasse = 'ABERTO'
    `);

    // ✅ Índices de busca
    await queryRunner.query(
      `CREATE INDEX "IDX_repasse_ofertante_id" ON "repasse" ("ofertante_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_repasse_status" ON "repasse" ("status_repasse")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_repasse_tipo_sistema" ON "repasse" ("tipo_escala_repasse", "sistema_repasse")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_repasse_data" ON "repasse" ("data_inicio_repasse")`,
    );

    await queryRunner.createForeignKey(
      'repasse',
      new TableForeignKey({
        columnNames: ['escala_id'],
        referencedTableName: 'escala',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'repasse',
      new TableForeignKey({
        columnNames: ['ofertante_id'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'repasse',
      new TableForeignKey({
        columnNames: ['receptor_id'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_repasse_escala_aberto"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_repasse_ofertante_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_repasse_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_repasse_tipo_sistema"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_repasse_data"`);

    const table = await queryRunner.getTable('repasse');
    if (table) {
      for (const fk of table.foreignKeys) {
        await queryRunner.dropForeignKey('repasse', fk);
      }
    }

    await queryRunner.dropTable('repasse');
  }
}
