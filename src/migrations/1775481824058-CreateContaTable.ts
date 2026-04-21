import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableUnique,
} from 'typeorm';

export class CreateContaTable1775481824058 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'conta',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'usuario_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'banco',
            type: 'varchar',
            length: '120',
            isNullable: false,
          },
          {
            name: 'agencia',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'conta',
            type: 'varchar',
            length: '30',
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

          {
            name: 'created_by_user_id',
            type: 'integer',
            isNullable: true,
          },

          {
            name: 'updated_by_user_id',
            type: 'integer',
            isNullable: true,
          },
        ],
        uniques: [
          // 🔒 1 CONTA POR USUÁRIO
          new TableUnique({
            name: 'uq_conta_usuario',
            columnNames: ['usuario_id'],
          }),

          // 🔒 A MESMA CONTA NÃO PODE EXISTIR PARA OUTRO USUÁRIO
          new TableUnique({
            name: 'uq_conta_dados',
            columnNames: ['banco', 'agencia', 'conta'],
          }),
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'conta',
      new TableForeignKey({
        columnNames: ['usuario_id'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'conta',
      new TableForeignKey({
        columnNames: ['created_by_user_id'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'conta',
      new TableForeignKey({
        columnNames: ['updated_by_user_id'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('conta');
  }
}
