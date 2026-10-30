import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Operação compartilhada + vagas em aberto.
 *
 * Esta migration NÃO altera nenhum dado existente:
 *  - cria 1 tabela nova;
 *  - adiciona colunas com valor padrão (escalas atuais ficam is_vaga_aberta = false);
 *  - relaxa NOT NULL de colunas (só permite NULL, nunca remove valor).
 *
 * Faça backup antes de rodar em produção.
 */
export class OperacaoCompartilhadaEVagas1792195200000 implements MigrationInterface {
  name = 'OperacaoCompartilhadaEVagas1792195200000';

  public async up(q: QueryRunner): Promise<void> {
    // ── 1) Tabela de compartilhamento (operação ↔ OMEs participantes) ────────
    await q.query(`
      CREATE TABLE "operacao_ome_compartilhada" (
        "id" SERIAL PRIMARY KEY,
        "operacao_id" integer NOT NULL,
        "ome_id" integer NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_operacao_ome_compartilhada"
          UNIQUE ("operacao_id", "ome_id"),
        CONSTRAINT "FK_oper_comp_operacao"
          FOREIGN KEY ("operacao_id") REFERENCES "operacao"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_oper_comp_ome"
          FOREIGN KEY ("ome_id") REFERENCES "ome"("id") ON DELETE CASCADE
      )
    `);
    await q.query(
      `CREATE INDEX "IDX_oper_comp_ome" ON "operacao_ome_compartilhada" ("ome_id")`,
    );

    // ── 2) Campos de vaga na escala ───────────────────────────────────────────
    await q.query(`
      ALTER TABLE "escala"
        ADD COLUMN "is_vaga_aberta" boolean NOT NULL DEFAULT false,
        ADD COLUMN "ome_destino_id" integer NULL,
        ADD COLUMN "preenchida_por_id" integer NULL,
        ADD COLUMN "preenchida_em" timestamp NULL
    `);
    await q.query(`
      ALTER TABLE "escala"
        ADD CONSTRAINT "FK_escala_ome_destino"
          FOREIGN KEY ("ome_destino_id") REFERENCES "ome"("id") ON DELETE SET NULL,
        ADD CONSTRAINT "FK_escala_preenchida_por"
          FOREIGN KEY ("preenchida_por_id") REFERENCES "user"("id") ON DELETE SET NULL
    `);

    // ── 3) Vaga não tem pessoa: campos do usuário/SGP passam a aceitar NULL ──
    // (tipo_escala e nomeome_escala continuam NOT NULL)
    await q.query(`
      ALTER TABLE "escala"
        ALTER COLUMN "usuario_id" DROP NOT NULL,
        ALTER COLUMN "pg_escala" DROP NOT NULL,
        ALTER COLUMN "mat_escala" DROP NOT NULL,
        ALTER COLUMN "ng_escala" DROP NOT NULL,
        ALTER COLUMN "cpf_escala" DROP NOT NULL,
        ALTER COLUMN "nomecompleto_escala" DROP NOT NULL,
        ALTER COLUMN "nunfunc_escala" DROP NOT NULL,
        ALTER COLUMN "nunvinc_escala" DROP NOT NULL
    `);

    // ── 4) Trava de segurança: vaga aberta <=> sem usuário ───────────────────
    // Impede estados inválidos mesmo se algum código futuro errar.
    await q.query(`
      ALTER TABLE "escala"
        ADD CONSTRAINT "CK_escala_vaga_consistente" CHECK (
          ("is_vaga_aberta" = true  AND "usuario_id" IS NULL)
          OR
          ("is_vaga_aberta" = false AND "usuario_id" IS NOT NULL)
        )
    `);

    // ── 5) Índice parcial para listar vagas abertas ──────────────────────────
    await q.query(`
      CREATE INDEX "IDX_escala_vaga_aberta"
      ON "escala" ("ome_destino_id", "operacao_id")
      WHERE "is_vaga_aberta" = true
    `);

    // A unique (mat_escala, sistema, data_inicio) NÃO precisa mudar:
    // no Postgres NULL <> NULL, então várias vagas (mat NULL) convivem.
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS "IDX_escala_vaga_aberta"`);
    await q.query(
      `ALTER TABLE "escala" DROP CONSTRAINT IF EXISTS "CK_escala_vaga_consistente"`,
    );

    // Vagas não existem no modelo antigo: precisam sair para voltar o NOT NULL.
    await q.query(`DELETE FROM "escala" WHERE "is_vaga_aberta" = true`);

    await q.query(`
      ALTER TABLE "escala"
        ALTER COLUMN "usuario_id" SET NOT NULL,
        ALTER COLUMN "pg_escala" SET NOT NULL,
        ALTER COLUMN "mat_escala" SET NOT NULL,
        ALTER COLUMN "ng_escala" SET NOT NULL,
        ALTER COLUMN "cpf_escala" SET NOT NULL,
        ALTER COLUMN "nomecompleto_escala" SET NOT NULL,
        ALTER COLUMN "nunfunc_escala" SET NOT NULL,
        ALTER COLUMN "nunvinc_escala" SET NOT NULL
    `);

    await q.query(`
      ALTER TABLE "escala"
        DROP CONSTRAINT IF EXISTS "FK_escala_ome_destino",
        DROP CONSTRAINT IF EXISTS "FK_escala_preenchida_por"
    `);
    await q.query(`
      ALTER TABLE "escala"
        DROP COLUMN "preenchida_em",
        DROP COLUMN "preenchida_por_id",
        DROP COLUMN "ome_destino_id",
        DROP COLUMN "is_vaga_aberta"
    `);

    await q.query(`DROP TABLE "operacao_ome_compartilhada"`);
  }
}
