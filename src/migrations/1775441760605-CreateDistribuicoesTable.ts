import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateDistribuicaoTable1775441760605 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'distribuicao',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'teto_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'diretoria_id',
            type: 'int',
            isNullable: false,
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

    // FK → TETOS
    await queryRunner.createForeignKey(
      'distribuicao',
      new TableForeignKey({
        columnNames: ['teto_id'],
        referencedTableName: 'tetos',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // FK → DIRETORIAS
    await queryRunner.createForeignKey(
      'distribuicao',
      new TableForeignKey({
        columnNames: ['diretoria_id'],
        referencedTableName: 'diretoria',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('distribuicao');
  }
}
