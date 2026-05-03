import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateEventoTable1775481824057 implements MigrationInterface {
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
            name: 'nome_evento',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'qtd_of_evento',
            type: 'int',
          },
          {
            name: 'qtd_prc_evento',
            type: 'int',
          },
          {
            name: 'user_id_evento',
            type: 'int',
            isNullable: false,
          },

          {
            name: 'status_evento',
            type: 'enum',
            enum: ['CRIADO', 'HOMOLOGADO', 'PD_CONCLUIDA', 'PAGO'],
            default: `'CRIADO'`,
          },

          // 🔥 TIMESTAMPS DE TRANSIÇÃO
          {
            name: 'homologado_em',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'pd_concluida_em',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'pago_em',
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
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );

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

    await queryRunner.createIndex(
      'evento',
      new TableIndex({
        name: 'IDX_EVENTO_USER',
        columnNames: ['user_id_evento'],
      }),
    );

    await queryRunner.createIndex(
      'evento',
      new TableIndex({
        name: 'IDX_EVENTO_DIST_OME',
        columnNames: ['distribuicao_id', 'ome_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'evento',
      new TableForeignKey({
        columnNames: ['distribuicao_id'],
        referencedTableName: 'distribuicao',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'evento',
      new TableForeignKey({
        columnNames: ['ome_id'],
        referencedTableName: 'ome',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'evento',
      new TableForeignKey({
        columnNames: ['user_id_evento'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('evento');
  }
}
