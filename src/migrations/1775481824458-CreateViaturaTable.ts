import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateViaturaTable1775481824457 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'viatura',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'patrimonio',
            type: 'varchar',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'km_atual',
            type: 'integer',
            isNullable: false,
            default: 0,
          },
          {
            name: 'status_vtr',
            type: 'enum',
            enum: ['DISPONIVEL', 'INDISPONIVEL'],
            default: "'DISPONIVEL'",
          },
          {
            name: 'anotacao',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'omeid',
            type: 'integer',
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
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'viatura',
      new TableForeignKey({
        columnNames: ['omeid'],
        referencedTableName: 'ome',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT', // impede deletar OME que tem viatura
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('viatura');
    if (table) {
      const fk = table.foreignKeys.find((fk) =>
        fk.columnNames.includes('omeid'),
      );
      if (fk) await queryRunner.dropForeignKey('viatura', fk);
    }
    await queryRunner.dropTable('viatura');
  }
}
