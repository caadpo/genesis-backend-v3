import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

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
            name: 'imagem_url',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'sistema',
            type: 'enum',
            enumName: 'tetos_sistema_enum',
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
            name: 'ttctof',
            type: 'int',
          },
          {
            name: 'ttctprc',
            type: 'int',
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
            enumName: 'tetos_tipo_periodo_enum',
            enum: ['MENSAL', 'OPERACAO'],
          },
          {
            name: 'status',
            type: 'enum',
            enumName: 'tetos_status_enum',
            enum: ['ABERTO', 'ENCERRADO'],
            default: `'ABERTO'`,
          },
          {
            name: 'data_prestacao_contas',
            type: 'timestamp',
            isNullable: true,
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
    );

    // 🔥 Índices essenciais para suas consultas reais
    await queryRunner.createIndex(
      'tetos',
      new TableIndex({
        name: 'IDX_TETOS_SISTEMA',
        columnNames: ['sistema'],
      }),
    );

    await queryRunner.createIndex(
      'tetos',
      new TableIndex({
        name: 'IDX_TETOS_STATUS',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'tetos',
      new TableIndex({
        name: 'IDX_TETOS_DATA_PERIODO',
        columnNames: ['data_inicio', 'data_fim'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('tetos');
    await queryRunner.query(`DROP TYPE IF EXISTS tetos_sistema_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS tetos_tipo_periodo_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS tetos_status_enum`);
  }
}
