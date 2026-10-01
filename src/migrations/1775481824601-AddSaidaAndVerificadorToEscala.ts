import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class AddSaidaAndVerificadorToEscala1775481824601 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Remove FK e colunas antigas de observação ────────────────────────────
    const table = await queryRunner.getTable('escala');
    const fkObsAutor = table?.foreignKeys.find((fk) =>
      fk.columnNames.includes('observacao_escrita_por_id'),
    );
    if (fkObsAutor) {
      await queryRunner.dropForeignKey('escala', fkObsAutor);
    }

    await queryRunner.dropColumn('escala', 'presenca_observacao');
    await queryRunner.dropColumn('escala', 'observacao_escrita_por_id');
    await queryRunner.dropColumn('escala', 'observacao_escrita_em');

    // ── Saída de serviço ──────────────────────────────────────────────────────
    await queryRunner.addColumns('escala', [
      new TableColumn({
        name: 'saida_confirmada',
        type: 'boolean',
        isNullable: false,
        default: false,
      }),
      new TableColumn({
        name: 'saida_confirmada_por_id',
        type: 'integer',
        isNullable: true,
      }),
      new TableColumn({
        name: 'saida_confirmada_em',
        type: 'timestamp',
        isNullable: true,
      }),
    ]);

    // ── 1ª verificação (fiscal) ───────────────────────────────────────────────
    await queryRunner.addColumns('escala', [
      new TableColumn({
        name: 'primeira_verificacao',
        type: 'boolean',
        isNullable: false,
        default: false,
      }),
      new TableColumn({
        name: 'id_verificador1',
        type: 'integer',
        isNullable: true,
      }),
      new TableColumn({
        name: 'data_hora_verificador1',
        type: 'timestamp',
        isNullable: true,
      }),
      new TableColumn({
        name: 'obs_verificador1',
        type: 'text',
        isNullable: true,
      }),
    ]);

    // ── 2ª verificação (fiscal) ───────────────────────────────────────────────
    await queryRunner.addColumns('escala', [
      new TableColumn({
        name: 'segunda_verificacao',
        type: 'boolean',
        isNullable: false,
        default: false,
      }),
      new TableColumn({
        name: 'id_verificador2',
        type: 'integer',
        isNullable: true,
      }),
      new TableColumn({
        name: 'data_hora_verificador2',
        type: 'timestamp',
        isNullable: true,
      }),
      new TableColumn({
        name: 'obs_verificador2',
        type: 'text',
        isNullable: true,
      }),
    ]);

    // ── Foreign keys (SET NULL — não deve apagar a escala se o usuário sumir) ──
    await queryRunner.createForeignKey(
      'escala',
      new TableForeignKey({
        name: 'FK_escala_saida_confirmada_por',
        columnNames: ['saida_confirmada_por_id'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'escala',
      new TableForeignKey({
        name: 'FK_escala_verificador1',
        columnNames: ['id_verificador1'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'escala',
      new TableForeignKey({
        name: 'FK_escala_verificador2',
        columnNames: ['id_verificador2'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // ── Índice parcial usado pelo cron que fecha saídas automaticamente ──────
    await queryRunner.query(`
      CREATE INDEX "IDX_escala_saida_pendente"
      ON escala (data_inicio, hora_fim)
      WHERE presenca_confirmada = true AND saida_confirmada = false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_escala_saida_pendente"`);

    const table = await queryRunner.getTable('escala');

    for (const fkName of [
      'FK_escala_saida_confirmada_por',
      'FK_escala_verificador1',
      'FK_escala_verificador2',
    ]) {
      const fk = table?.foreignKeys.find((f) => f.name === fkName);
      if (fk) await queryRunner.dropForeignKey('escala', fk);
    }

    await queryRunner.dropColumns('escala', [
      'saida_confirmada',
      'saida_confirmada_por_id',
      'saida_confirmada_em',
      'primeira_verificacao',
      'id_verificador1',
      'data_hora_verificador1',
      'obs_verificador1',
      'segunda_verificacao',
      'id_verificador2',
      'data_hora_verificador2',
      'obs_verificador2',
    ]);

    // Restaura colunas antigas de observação
    await queryRunner.addColumns('escala', [
      new TableColumn({
        name: 'presenca_observacao',
        type: 'text',
        isNullable: true,
      }),
      new TableColumn({
        name: 'observacao_escrita_por_id',
        type: 'integer',
        isNullable: true,
      }),
      new TableColumn({
        name: 'observacao_escrita_em',
        type: 'timestamp',
        isNullable: true,
      }),
    ]);

    await queryRunner.createForeignKey(
      'escala',
      new TableForeignKey({
        name: 'FK_escala_observacao_escrita_por',
        columnNames: ['observacao_escrita_por_id'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }
}
