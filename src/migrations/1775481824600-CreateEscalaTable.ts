import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateEscalaTable1775481824600 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'escala',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },

          {
            name: 'sistema',
            type: 'enum',
            enum: ['PJES', 'DIARIAS'],
            isNullable: false,
          },

          // ─── Referências ──────────────────────────────────────────────────
          { name: 'mat', type: 'integer', isNullable: false },
          { name: 'operacao_id', type: 'integer', isNullable: false },
          { name: 'usuario_id', type: 'integer', isNullable: false },

          // ─── Snapshot imutável do usuário no momento da criação ───────────
          { name: 'cpf_escala', type: 'varchar', isNullable: false },
          { name: 'pg_escala', type: 'varchar', isNullable: false },
          { name: 'tipo_escala', type: 'varchar', isNullable: false },
          { name: 'nome_escala', type: 'varchar', isNullable: false },
          { name: 'nomeome_escala', type: 'varchar', isNullable: false },
          { name: 'phone_escala', type: 'varchar', isNullable: true },
          { name: 'banco_escala', type: 'varchar', isNullable: false },
          { name: 'agencia_escala', type: 'varchar', isNullable: false },
          { name: 'conta_escala', type: 'varchar', isNullable: false },

          // ─── Dados da escala ──────────────────────────────────────────────
          { name: 'data_inicio', type: 'date', isNullable: false },
          { name: 'hora_inicio', type: 'time', isNullable: false },
          { name: 'hora_fim', type: 'time', isNullable: false },
          { name: 'cota_escala', type: 'integer', isNullable: false },

          {
            name: 'local_apresentacao',
            type: 'varchar',
            isNullable: false,
            default: `'SEDE DA OME'`,
          },
          { name: 'funcao', type: 'varchar', length: '100', isNullable: false },
          {
            name: 'situacao',
            type: 'varchar',
            length: '50',
            isNullable: false,
            default: `'REGULAR'`,
          },
          { name: 'anotacoes', type: 'text', isNullable: true },

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

    // ✅ Unicidade: mat + data + sistema
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_escala_mat_data_sistema"
       ON "escala" ("mat", "data_inicio", "sistema")`,
    );

    // ✅ Índices de busca performática
    await queryRunner.query(
      `CREATE INDEX "IDX_escala_operacao_id" ON "escala" ("operacao_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_escala_usuario_id" ON "escala" ("usuario_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_escala_data_inicio" ON "escala" ("data_inicio")`,
    );
    // ✅ Índice para queries por tipo (verificarTeto)
    await queryRunner.query(
      `CREATE INDEX "IDX_escala_tipo_escala" ON "escala" ("tipo_escala")`,
    );

    await queryRunner.createForeignKey(
      'escala',
      new TableForeignKey({
        columnNames: ['operacao_id'],
        referencedTableName: 'operacao',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'escala',
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
      `DROP INDEX IF EXISTS "IDX_escala_mat_data_sistema"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_escala_operacao_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_escala_usuario_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_escala_data_inicio"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_escala_tipo_escala"`);

    const table = await queryRunner.getTable('escala');
    if (table) {
      for (const fk of table.foreignKeys) {
        await queryRunner.dropForeignKey('escala', fk);
      }
    }

    await queryRunner.dropTable('escala');
  }
}
