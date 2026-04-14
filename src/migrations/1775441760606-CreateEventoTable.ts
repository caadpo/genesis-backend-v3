import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateEventoTable1775441760606 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'evento',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'distribuicao_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'ome_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'nome',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'qtd_oficiais',
            type: 'int',
          },
          {
            name: 'qtd_pracas',
            type: 'int',
          },
          {
            name: 'valor_total',
            type: 'numeric',
            precision: 14,
            scale: 2,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: `'CRIADO'`,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );

    // 🔥 INDEXES (ESSENCIAL PRA PERFORMANCE DAS SOMAS)
    await queryRunner.createIndex(
      'evento',
      new TableIndex({
        name: 'IDX_EVENTO_DISTRIBUICAO',
        columnNames: ['distribuicao_id'],
      }),
    );

    await queryRunner.createIndex(
      'evento',
      new TableIndex({
        name: 'IDX_EVENTO_OME',
        columnNames: ['ome_id'],
      }),
    );

    // FK → DISTRIBUICAO
    await queryRunner.createForeignKey(
      'evento',
      new TableForeignKey({
        columnNames: ['distribuicao_id'],
        referencedTableName: 'distribuicao',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // FK → OME
    await queryRunner.createForeignKey(
      'evento',
      new TableForeignKey({
        columnNames: ['ome_id'],
        referencedTableName: 'ome',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('evento');
  }
}
