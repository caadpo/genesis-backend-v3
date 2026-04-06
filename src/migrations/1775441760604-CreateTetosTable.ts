import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateTetosTable1775441760604 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'tetos',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'sistema',
            type: 'enum',
            enum: ['PJES', 'DIARIAS'],
          },
          {
            name: 'nome_verba',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'cod_verba',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'valor_total',
            type: 'numeric',
            precision: 14,
            scale: 2,
          },
          {
            name: 'valor_oficial',
            type: 'numeric',
            precision: 10,
            scale: 2,
          },
          {
            name: 'valor_praca',
            type: 'numeric',
            precision: 10,
            scale: 2,
          },
          {
            name: 'data_inicio',
            type: 'date',
          },
          {
            name: 'data_fim',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'tipo_periodo',
            type: 'enum',
            enum: ['MENSAL', 'OPERACAO'],
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('tetos');
  }
}
