import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateUserTable1775481824056 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'user',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'loginsei', type: 'varchar', isNullable: false },
          { name: 'password', type: 'varchar', isNullable: false },
          { name: 'type_user', type: 'smallint', isNullable: false },
          { name: 'pg', type: 'varchar', isNullable: false },
          { name: 'mat', type: 'integer', isNullable: false },
          { name: 'ng', type: 'varchar', isNullable: false },
          { name: 'tipo', type: 'varchar', isNullable: false },
          { name: 'funcao', type: 'varchar', isNullable: false },
          { name: 'phone', type: 'varchar', isNullable: true },
          { name: 'omeid', type: 'integer', isNullable: false },
          { name: 'imagem_url', type: 'varchar', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_user_loginsei" ON "user" ("loginsei")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_user_mat" ON "user" ("mat")`,
    );

    await queryRunner.createForeignKey(
      'user',
      new TableForeignKey({
        columnNames: ['omeid'],
        referencedTableName: 'ome',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('user');
    if (table) {
      const foreignKey = table.foreignKeys.find((fk) =>
        fk.columnNames.includes('omeid'),
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('user', foreignKey);
      }
    }

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_loginsei"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_mat"`);

    await queryRunner.dropTable('user');
  }
}
