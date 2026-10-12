import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAvisosTable1775481824612 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'avisos',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'nome', type: 'varchar', length: '150' },
          { name: 'descricao', type: 'text', isNullable: true },
          { name: 'imagem_url', type: 'varchar', isNullable: true },
          { name: 'data_hora', type: 'timestamptz' },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
    );

    await queryRunner.createIndex(
      'avisos',
      new TableIndex({
        name: 'IDX_AVISOS_DATA_HORA',
        columnNames: ['data_hora'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('avisos', 'IDX_AVISOS_DATA_HORA');
    await queryRunner.dropTable('avisos');
  }
}
