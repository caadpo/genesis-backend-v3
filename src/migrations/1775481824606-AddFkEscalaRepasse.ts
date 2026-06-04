// src/migrations/1775481824606-AddFkEscalaRepasse.ts
import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

export class AddFkEscalaRepasse1775481824606 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createForeignKey(
      'escala',
      new TableForeignKey({
        name: 'FK_escala_repasse_origem',
        columnNames: ['repasse_origem_id'],
        referencedTableName: 'repasse',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('escala', 'FK_escala_repasse_origem');
  }
}
