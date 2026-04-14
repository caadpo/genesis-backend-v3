import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateOperacaoTable1775441760607 implements MigrationInterface {
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
            name: 'nomeoperacao',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'codverba',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'eventoid',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'omeid',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'ttctofoper',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'ttctprcoper',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'userid',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'codop',
            type: 'varchar',
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

    // FK → EVENTO
    await queryRunner.createForeignKey(
      'operacao',
      new TableForeignKey({
        columnNames: ['eventoid'],
        referencedTableName: 'evento',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // FK → OME
    await queryRunner.createForeignKey(
      'operacao',
      new TableForeignKey({
        columnNames: ['omeid'],
        referencedTableName: 'ome',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // INDEX ÚNICO CODOP (igual @Index da entity)
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_OPERACAO_CODOP" ON operacao (codop)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('operacao');
  }
}
