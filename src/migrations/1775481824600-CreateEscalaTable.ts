import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
  TableUnique,
} from 'typeorm';

export class CreateEscalaTable1775481824600 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'escala',
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
            isNullable: false,
          },
          {
            name: 'operacao_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'usuario_id',
            type: 'integer',
            isNullable: false,
          },

          // ── Snapshot dos dados do SGP no momento da criação ──────────────────
          // Esses campos são copiados de dadossgp no momento da criação e ficam
          // imutáveis, garantindo integridade histórica mesmo que o SGP mude.
          {
            name: 'pg_escala',
            type: 'varchar',
            isNullable: false,
            comment: 'Posto/Graduação copiado de dadossgp.pgsgp',
          },
          {
            name: 'mat_escala',
            type: 'varchar',
            isNullable: false,
            comment: 'Matrícula copiada de dadossgp.matsgp',
          },
          {
            name: 'ng_escala',
            type: 'varchar',
            isNullable: false,
            comment: 'Nome de guerra copiado de dadossgp.nomeguerrasgp',
          },
          {
            name: 'tipo_escala',
            type: 'varchar',
            isNullable: false,
            comment: 'Tipo (O/P) copiado de dadossgp.tiposgp',
          },
          {
            name: 'cpf_escala',
            type: 'varchar',
            isNullable: false,
            comment: 'CPF copiado de dadossgp.cpfsgp',
          },
          {
            name: 'nomecompleto_escala',
            type: 'varchar',
            isNullable: false,
            comment: 'Nome completo copiado de dadossgp.nomecompletosgp',
          },
          {
            name: 'nomeome_escala',
            type: 'varchar',
            isNullable: false,
            comment: 'Nome da OME do usuário no momento da escala',
          },
          {
            name: 'nunfunc_escala',
            type: 'varchar',
            isNullable: false,
            comment: 'Número de funcionário copiado de dadossgp.nunfuncsgp',
          },
          {
            name: 'nunvinc_escala',
            type: 'varchar',
            isNullable: false,
            comment: 'Número de vínculo copiado de dadossgp.nunvincsgp',
          },
          // ─────────────────────────────────────────────────────────────────────

          {
            name: 'conta_id',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'data_inicio',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'hora_inicio',
            type: 'time',
            isNullable: false,
          },
          {
            name: 'hora_fim',
            type: 'time',
            isNullable: false,
          },
          {
            name: 'cota_escala',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'local_apresentacao',
            type: 'varchar',
            isNullable: false,
            default: `'SEDE DA OME'`,
          },
          {
            name: 'funcao',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'situacao',
            type: 'varchar',
            length: '50',
            isNullable: false,
            default: `'REGULAR'`,
          },
          {
            name: 'anotacoes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'viatura_id',
            type: 'integer',
            isNullable: true,
          },

          {
            name: 'is_repasse',
            type: 'boolean',
            isNullable: false,
            default: false,
            comment: 'Indica se essa escala foi obtida via repasse',
          },
          {
            name: 'repasse_origem_id',
            type: 'integer',
            isNullable: true,
            comment: 'ID do repasse que originou esta escala',
          },
          {
            name: 'presenca_confirmada',
            type: 'boolean',
            isNullable: false,
            default: false,
            comment: 'Indica se a presença do policial foi confirmada',
          },
          {
            name: 'presenca_observacao',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'presenca_confirmada_em',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'presenca_confirmada_por_id',
            type: 'integer',
            isNullable: true,
          },

          {
            name: 'observacao_escrita_em',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'observacao_escrita_por_id',
            type: 'integer',
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
      true,
    );

    // ── Índices de busca ──────────────────────────────────────────────────────
    await queryRunner.createIndex(
      'escala',
      new TableIndex({
        name: 'IDX_escala_operacao_id',
        columnNames: ['operacao_id'],
      }),
    );
    await queryRunner.createIndex(
      'escala',
      new TableIndex({
        name: 'IDX_escala_usuario_id',
        columnNames: ['usuario_id'],
      }),
    );
    await queryRunner.createIndex(
      'escala',
      new TableIndex({
        name: 'IDX_escala_data_inicio',
        columnNames: ['data_inicio'],
      }),
    );
    // Índice para buscas por matrícula (PJES por mês, DIARIAS por período)
    await queryRunner.createIndex(
      'escala',
      new TableIndex({
        name: 'IDX_escala_mat_escala',
        columnNames: ['mat_escala'],
      }),
    );
    // Índice composto para a busca mais comum: escalas de uma matrícula por sistema/data
    await queryRunner.createIndex(
      'escala',
      new TableIndex({
        name: 'IDX_escala_mat_sistema_data',
        columnNames: ['mat_escala', 'sistema', 'data_inicio'],
      }),
    );

    // 👇 ADICIONAR este índice parcial (performance para buscar pendências)
    await queryRunner.query(`
      CREATE INDEX "IDX_escala_presenca_pendente"
      ON escala (operacao_id)
      WHERE presenca_confirmada = false
    `);

    // ── Unique constraint: mesma mat + sistema + data → BLOQUEADO ─────────────
    // Reflete o @Index(['mat_escala', 'dataInicio', 'sistema'], { unique: true })
    // declarado na EscalaEntity. Garante unicidade no banco de forma nativa,
    // independente do ORM.
    await queryRunner.createUniqueConstraint(
      'escala',
      new TableUnique({
        name: 'UQ_escala_mat_sistema_data',
        columnNames: ['mat_escala', 'sistema', 'data_inicio'],
      }),
    );

    // ── Foreign Keys ──────────────────────────────────────────────────────────

    // FK: operacao (CASCADE — escala sem operação não faz sentido)
    await queryRunner.createForeignKey(
      'escala',
      new TableForeignKey({
        name: 'FK_escala_operacao',
        columnNames: ['operacao_id'],
        referencedTableName: 'operacao',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // FK: user (CASCADE — escala sem usuário não faz sentido)
    await queryRunner.createForeignKey(
      'escala',
      new TableForeignKey({
        name: 'FK_escala_usuario',
        columnNames: ['usuario_id'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // FK: conta (SET NULL — nullable; escala não deve sumir se conta for removida)
    await queryRunner.createForeignKey(
      'escala',
      new TableForeignKey({
        name: 'FK_escala_conta',
        columnNames: ['conta_id'],
        referencedTableName: 'conta',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // FK: viatura (SET NULL — nullable; escala não deve sumir se viatura for removida)
    await queryRunner.createForeignKey(
      'escala',
      new TableForeignKey({
        name: 'FK_escala_viatura',
        columnNames: ['viatura_id'],
        referencedTableName: 'viatura',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // 👇 ADICIONAR esta FK
    await queryRunner.createForeignKey(
      'escala',
      new TableForeignKey({
        name: 'FK_escala_presenca_confirmada_por',
        columnNames: ['presenca_confirmada_por_id'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('escala');
    if (table) {
      for (const fk of table.foreignKeys) {
        await queryRunner.dropForeignKey('escala', fk);
      }
      for (const uq of table.uniques) {
        await queryRunner.dropUniqueConstraint('escala', uq);
      }
    }

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_escala_presenca_pendente"`,
    );

    await queryRunner.dropIndex('escala', 'IDX_escala_mat_sistema_data');
    await queryRunner.dropIndex('escala', 'IDX_escala_mat_escala');
    await queryRunner.dropIndex('escala', 'IDX_escala_data_inicio');
    await queryRunner.dropIndex('escala', 'IDX_escala_usuario_id');
    await queryRunner.dropIndex('escala', 'IDX_escala_operacao_id');

    await queryRunner.dropTable('escala');
  }
}
