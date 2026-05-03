import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateOperacaoTable1775481824058 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'operacao',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'evento_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'ome_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'nome_operacao',
            type: 'varchar',
            length: '120',
            isNullable: false,
          },

          {
            name: 'qtd_oficiais_oper',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'qtd_pracas_oper',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'cod_op',
            type: 'varchar',
            length: '50',
            isNullable: false,
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

    // INDEX ÚNICO DO @Index(['cod_op'], { unique: true })
    await queryRunner.createIndex(
      'operacao',
      new TableIndex({
        name: 'IDX_OPERACAO_COD_OP',
        columnNames: ['cod_op'],
        isUnique: true,
      }),
    );

    // FK → EVENTO
    await queryRunner.createForeignKey(
      'operacao',
      new TableForeignKey({
        columnNames: ['evento_id'],
        referencedTableName: 'evento',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // FK → OME
    await queryRunner.createForeignKey(
      'operacao',
      new TableForeignKey({
        columnNames: ['ome_id'],
        referencedTableName: 'ome',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('operacao');
  }
}
