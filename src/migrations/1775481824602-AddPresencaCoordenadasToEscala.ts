// src/migrations/1775481824602-AddPresencaCoordenadasToEscala.ts
import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPresencaCoordenadasToEscala1775481824602 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('escala', [
      new TableColumn({
        name: 'presenca_latitude',
        type: 'double precision',
        isNullable: true,
        comment: 'Latitude do local onde o policial confirmou a presença',
      }),
      new TableColumn({
        name: 'presenca_longitude',
        type: 'double precision',
        isNullable: true,
        comment: 'Longitude do local onde o policial confirmou a presença',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns('escala', [
      'presenca_latitude',
      'presenca_longitude',
    ]);
  }
}
