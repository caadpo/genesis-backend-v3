import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class AddDestinatarioRepasse1775481824607 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('repasse', [
      new TableColumn({
        name: 'destinatario_id',
        type: 'integer',
        isNullable: true,
      }),
      new TableColumn({
        name: 'mat_destinatario',
        type: 'varchar',
        isNullable: true,
      }),
    ]);

    await queryRunner.createForeignKey(
      'repasse',
      new TableForeignKey({
        name: 'FK_repasse_destinatario',
        columnNames: ['destinatario_id'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_repasse_destinatario_id" ON "repasse" ("destinatario_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_repasse_destinatario_id"`,
    );
    await queryRunner.dropForeignKey('repasse', 'FK_repasse_destinatario');
    await queryRunner.dropColumns('repasse', [
      'destinatario_id',
      'mat_destinatario',
    ]);
  }
}
