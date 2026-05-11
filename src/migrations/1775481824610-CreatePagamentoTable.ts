import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreatePagamentoTable1775481824610 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'pagamento',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'evento_id', type: 'integer', isNullable: false },
          { name: 'usuario_id', type: 'integer', isNullable: false },
          { name: 'mat', type: 'integer', isNullable: false },
          { name: 'pg_pagamento', type: 'varchar', isNullable: false },
          { name: 'nome_pagamento', type: 'varchar', isNullable: false },
          { name: 'nomeome_pagamento', type: 'varchar', isNullable: false },
          { name: 'cpf_pagamento', type: 'varchar', isNullable: false },
          { name: 'tipo_pagamento', type: 'varchar', isNullable: false },
          { name: 'banco_pagamento', type: 'varchar', isNullable: false },
          { name: 'agencia_pagamento', type: 'varchar', isNullable: false },
          { name: 'conta_pagamento', type: 'varchar', isNullable: false },
          { name: 'sistema', type: 'varchar', isNullable: false },
          { name: 'nome_verba', type: 'varchar', isNullable: false },
          { name: 'total_cotas', type: 'integer', isNullable: false },
          {
            name: 'valor_cota',
            type: 'numeric',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'valor_total',
            type: 'numeric',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
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

    // ✅ Unicidade: um usuário, um pagamento por evento
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_pagamento_evento_usuario"
       ON "pagamento" ("evento_id", "usuario_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_pagamento_evento_id" ON "pagamento" ("evento_id")`,
    );

    await queryRunner.createForeignKey(
      'pagamento',
      new TableForeignKey({
        columnNames: ['evento_id'],
        referencedTableName: 'evento',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'pagamento',
      new TableForeignKey({
        columnNames: ['usuario_id'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_pagamento_evento_usuario"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_pagamento_evento_id"`);

    const table = await queryRunner.getTable('pagamento');
    if (table) {
      for (const fk of table.foreignKeys) {
        await queryRunner.dropForeignKey('pagamento', fk);
      }
    }

    await queryRunner.dropTable('pagamento');
  }
}
