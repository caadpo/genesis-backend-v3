import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateDadossgpTable1775481824160 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'dadossgp',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'matsgp', type: 'int', isNullable: false },
          { name: 'pgsgp', type: 'varchar', isNullable: false },
          { name: 'ngsgp', type: 'varchar', isNullable: false },
          { name: 'nomecompletosgp', type: 'varchar', isNullable: false },
          { name: 'omesgp', type: 'varchar', isNullable: false },
          { name: 'tiposgp', type: 'varchar', length: '1', isNullable: false },
          { name: 'nunfuncsgp', type: 'int', isNullable: false },
          { name: 'nunvincsgp', type: 'int', isNullable: false },
          { name: 'localapresentacaosgp', type: 'varchar', isNullable: false },
          { name: 'situacaosgp', type: 'varchar', isNullable: false },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('dadossgp');
  }
}
