import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

export class SeedInicialDiretoriasOmesUser1775481824457 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    /**
     * 🔥 LIMPEZA TOTAL (idempotente para DEV)
     */
    await queryRunner.query(`DELETE FROM distribuicao;`);
    await queryRunner.query(`DELETE FROM tetos;`);
    await queryRunner.query(`DELETE FROM dadossgp;`);
    await queryRunner.query(`DELETE FROM "user";`);
    await queryRunner.query(`DELETE FROM ome;`);
    await queryRunner.query(`DELETE FROM diretoria;`);

    /**
     * 🔹 DIRETORIAS
     */
    await queryRunner.query(`
        INSERT INTO diretoria (nomediretoria)
        VALUES
          ('DPO'),
          ('DIM'),
          ('DIRESP'),
          ('DINTER I'),
          ('DINTER II'),
          ('DASDH'),
          ('TJPE'),
          ('CPRH'),
          ('TCE'),
          ('OE'),
          ('CAMIL'),
          ('MPPE'),
          ('ALEPE');   
      `);

    /**
     * 🔹 OMEs
     */
    await queryRunner.query(`
        INSERT INTO ome (nomeome, diretoriaid)

        -- DPO
        SELECT 'DPO SEDE', id FROM diretoria WHERE nomediretoria = 'DPO'
        UNION ALL
        SELECT '2ª EMG', id FROM diretoria WHERE nomediretoria = 'DPO'
        UNION ALL
        SELECT 'ADAGRO', id FROM diretoria WHERE nomediretoria = 'DPO'
        UNION ALL
        SELECT 'OLS', id FROM diretoria WHERE nomediretoria = 'DPO'
        UNION ALL
        SELECT 'SDS', id FROM diretoria WHERE nomediretoria = 'DPO'
        UNION ALL
        SELECT 'SEFAZ', id FROM diretoria WHERE nomediretoria = 'DPO'
        UNION ALL
        SELECT 'ACG', id FROM diretoria WHERE nomediretoria = 'DPO'
        UNION ALL
        SELECT 'AECI', id FROM diretoria WHERE nomediretoria = 'DPO'
        UNION ALL
        SELECT 'AG', id FROM diretoria WHERE nomediretoria = 'DPO'
        UNION ALL
        SELECT 'APMP', id FROM diretoria WHERE nomediretoria = 'DPO'
        UNION ALL
        SELECT 'C.FARM', id FROM diretoria WHERE nomediretoria = 'DPO'
        UNION ALL
        SELECT 'C.ODONT', id FROM diretoria WHERE nomediretoria = 'DPO'
        UNION ALL
        SELECT 'CAMIL', id FROM diretoria WHERE nomediretoria = 'DPO'
        UNION ALL
        SELECT 'CEFD', id FROM diretoria WHERE nomediretoria = 'DPO'
        UNION ALL
        SELECT 'CFAP', id FROM diretoria WHERE nomediretoria = 'DPO'
        UNION ALL
        SELECT 'CIMUS', id FROM diretoria WHERE nomediretoria = 'DPO'
        UNION ALL
        SELECT 'CMH', id FROM diretoria WHERE nomediretoria = 'DPO'
        UNION ALL
        SELECT 'COPOM', id FROM diretoria WHERE nomediretoria = 'DPO'
        UNION ALL
        SELECT 'CPM', id FROM diretoria WHERE nomediretoria = 'DPO'
        UNION ALL
        SELECT 'CPM - ANEXO I', id FROM diretoria WHERE nomediretoria = 'DPO'
        UNION ALL
        SELECT 'CPO', id FROM diretoria WHERE nomediretoria = 'DPO'
        UNION ALL
        SELECT 'CPP', id FROM diretoria WHERE nomediretoria = 'DPO'
        UNION ALL
        SELECT 'CREED', id FROM diretoria WHERE nomediretoria = 'DPO'
        UNION ALL
        SELECT 'CRESEP', id FROM diretoria WHERE nomediretoria = 'DPO'
        UNION ALL
        SELECT 'CSM/INT', id FROM diretoria WHERE nomediretoria = 'DPO'
        UNION ALL
        SELECT 'CSM/MB', id FROM diretoria WHERE nomediretoria = 'DPO'
        UNION ALL
        SELECT 'CSM/MOTO', id FROM diretoria WHERE nomediretoria = 'DPO'
        UNION ALL
        SELECT 'CTT', id FROM diretoria WHERE nomediretoria = 'DPO'
        UNION ALL
        SELECT 'DAL', id FROM diretoria WHERE nomediretoria = 'DPO'
        UNION ALL
        SELECT 'DAS', id FROM diretoria WHERE nomediretoria = 'DPO'
        UNION ALL
        SELECT 'DASIS', id FROM diretoria WHERE nomediretoria = 'DPO'
        UNION ALL
        SELECT 'DEAJA', id FROM diretoria WHERE nomediretoria = 'DPO'
        UNION ALL
        SELECT 'DEIP', id FROM diretoria WHERE nomediretoria = 'DPO'
        UNION ALL
        SELECT 'DF', id FROM diretoria WHERE nomediretoria = 'DPO'
        UNION ALL
        SELECT 'DGA', id FROM diretoria WHERE nomediretoria = 'DPO'
        UNION ALL
        SELECT 'DGP', id FROM diretoria WHERE nomediretoria = 'DPO'
        UNION ALL
        SELECT 'DVP', id FROM diretoria WHERE nomediretoria = 'DPO'
        UNION ALL
        SELECT 'DPJM', id FROM diretoria WHERE nomediretoria = 'DPO'
        UNION ALL
        SELECT 'DS', id FROM diretoria WHERE nomediretoria = 'DPO'
        UNION ALL
        SELECT 'DTEC', id FROM diretoria WHERE nomediretoria = 'DPO'
        UNION ALL
        SELECT 'EMG', id FROM diretoria WHERE nomediretoria = 'DPO'
        UNION ALL
        SELECT 'SDS', id FROM diretoria WHERE nomediretoria = 'DPO'

        -- DIM
        UNION ALL
        SELECT 'DIM SEDE', id FROM diretoria WHERE nomediretoria = 'DIM'
        UNION ALL
        SELECT '1º BPM', id FROM diretoria WHERE nomediretoria = 'DIM'
        UNION ALL
        SELECT '6º BPM', id FROM diretoria WHERE nomediretoria = 'DIM'
        UNION ALL
        SELECT '11º BPM', id FROM diretoria WHERE nomediretoria = 'DIM'
        UNION ALL
        SELECT '12º BPM', id FROM diretoria WHERE nomediretoria = 'DIM'
        UNION ALL
        SELECT '13º BPM', id FROM diretoria WHERE nomediretoria = 'DIM'
        UNION ALL
        SELECT '16º BPM', id FROM diretoria WHERE nomediretoria = 'DIM'
        UNION ALL
        SELECT '17º BPM', id FROM diretoria WHERE nomediretoria = 'DIM'
        UNION ALL
        SELECT '18º BPM', id FROM diretoria WHERE nomediretoria = 'DIM'
        UNION ALL
        SELECT '19º BPM', id FROM diretoria WHERE nomediretoria = 'DIM'
        UNION ALL
        SELECT '20º BPM', id FROM diretoria WHERE nomediretoria = 'DIM'
        UNION ALL
        SELECT '25º BPM', id FROM diretoria WHERE nomediretoria = 'DIM'
        UNION ALL
        SELECT '26º BPM', id FROM diretoria WHERE nomediretoria = 'DIM'
        UNION ALL
        SELECT '28º BPM', id FROM diretoria WHERE nomediretoria = 'DIM'

        -- DIRESP
        UNION ALL
        SELECT 'DIRESP SEDE', id FROM diretoria WHERE nomediretoria = 'DIRESP'
        UNION ALL
        SELECT '1º BIESP', id FROM diretoria WHERE nomediretoria = 'DIRESP'
        UNION ALL
        SELECT '2º BIESP', id FROM diretoria WHERE nomediretoria = 'DIRESP'
        UNION ALL
        SELECT '3º BIESP', id FROM diretoria WHERE nomediretoria = 'DIRESP'
        UNION ALL
        SELECT '4º BIESP', id FROM diretoria WHERE nomediretoria = 'DIRESP'
        UNION ALL
        SELECT 'BEPI', id FROM diretoria WHERE nomediretoria = 'DIRESP'
        UNION ALL
        SELECT 'BPCHOQUE', id FROM diretoria WHERE nomediretoria = 'DIRESP'
        UNION ALL
        SELECT 'BOPE', id FROM diretoria WHERE nomediretoria = 'DIRESP'
        UNION ALL
        SELECT 'BPA', id FROM diretoria WHERE nomediretoria = 'DIRESP'
        UNION ALL
        SELECT 'BPGD', id FROM diretoria WHERE nomediretoria = 'DIRESP'
        UNION ALL
        SELECT 'BPRP', id FROM diretoria WHERE nomediretoria = 'DIRESP'
        UNION ALL
        SELECT 'BPRV', id FROM diretoria WHERE nomediretoria = 'DIRESP'
        UNION ALL
        SELECT 'BPTRAN', id FROM diretoria WHERE nomediretoria = 'DIRESP'
        UNION ALL
        SELECT 'BPTUR', id FROM diretoria WHERE nomediretoria = 'DIRESP'
        UNION ALL
        SELECT 'CIPCAES', id FROM diretoria WHERE nomediretoria = 'DIRESP'
        UNION ALL
        SELECT 'CIPMOTO', id FROM diretoria WHERE nomediretoria = 'DIRESP'
        UNION ALL
        SELECT 'RPMON', id FROM diretoria WHERE nomediretoria = 'DIRESP'
        
        -- DINTER I
        UNION ALL
        SELECT 'DINTER I SEDE', id FROM diretoria WHERE nomediretoria = 'DINTER I'
        UNION ALL
        SELECT '2º BPM', id FROM diretoria WHERE nomediretoria = 'DINTER I'
        UNION ALL
        SELECT '4º BPM', id FROM diretoria WHERE nomediretoria = 'DINTER I'
        UNION ALL
        SELECT '9º BPM', id FROM diretoria WHERE nomediretoria = 'DINTER I'
        UNION ALL
        SELECT '10º BPM', id FROM diretoria WHERE nomediretoria = 'DINTER I'
        UNION ALL
        SELECT '15º BPM', id FROM diretoria WHERE nomediretoria = 'DINTER I'
        UNION ALL
        SELECT '21º BPM', id FROM diretoria WHERE nomediretoria = 'DINTER I'
        UNION ALL
        SELECT '22º BPM', id FROM diretoria WHERE nomediretoria = 'DINTER I'
        UNION ALL
        SELECT '24º BPM', id FROM diretoria WHERE nomediretoria = 'DINTER I'
        UNION ALL
        SELECT '27º BPM', id FROM diretoria WHERE nomediretoria = 'DINTER I'
        UNION ALL
        SELECT '5ª CIPM', id FROM diretoria WHERE nomediretoria = 'DINTER I'
        UNION ALL
        SELECT '6ª CIPM', id FROM diretoria WHERE nomediretoria = 'DINTER I'
        UNION ALL
        SELECT '8ª CIPM', id FROM diretoria WHERE nomediretoria = 'DINTER I'
        UNION ALL
        SELECT '10ª CIPM', id FROM diretoria WHERE nomediretoria = 'DINTER I'
        UNION ALL
        SELECT '11ª CIPM', id FROM diretoria WHERE nomediretoria = 'DINTER I'

        -- DINTER II
        UNION ALL
        SELECT 'DINTER II SEDE', id FROM diretoria WHERE nomediretoria = 'DINTER II'
        UNION ALL
        SELECT '3º BPM', id FROM diretoria WHERE nomediretoria = 'DINTER II'
        UNION ALL
        SELECT '5º BPM', id FROM diretoria WHERE nomediretoria = 'DINTER II'
        UNION ALL
        SELECT '7º BPM', id FROM diretoria WHERE nomediretoria = 'DINTER II'
        UNION ALL
        SELECT '8º BPM', id FROM diretoria WHERE nomediretoria = 'DINTER II'
        UNION ALL
        SELECT '14º BPM', id FROM diretoria WHERE nomediretoria = 'DINTER II'
        UNION ALL
        SELECT '23º BPM', id FROM diretoria WHERE nomediretoria = 'DINTER II'
        UNION ALL
        SELECT '1ª CIPM', id FROM diretoria WHERE nomediretoria = 'DINTER II'
        UNION ALL
        SELECT '2ª CIPM', id FROM diretoria WHERE nomediretoria = 'DINTER II'
        UNION ALL
        SELECT '4ª CIPM', id FROM diretoria WHERE nomediretoria = 'DINTER II'
        UNION ALL
        SELECT '7ª CIPM', id FROM diretoria WHERE nomediretoria = 'DINTER II'
        UNION ALL
        SELECT '9ª CIPM', id FROM diretoria WHERE nomediretoria = 'DINTER II'

         -- DASDH
        UNION ALL
        SELECT 'DASDH SEDE', id FROM diretoria WHERE nomediretoria = 'DASDH'
        
         -- TJPE
        UNION ALL
        SELECT 'TJPE SEDE', id FROM diretoria WHERE nomediretoria = 'TJPE'

        -- CPRH
        UNION ALL
        SELECT 'CPRH SEDE', id FROM diretoria WHERE nomediretoria = 'CPRH'

        -- TCE
        UNION ALL
        SELECT 'TCE SEDE', id FROM diretoria WHERE nomediretoria = 'TCE'

        -- OE
        UNION ALL
        SELECT 'OE SEDE', id FROM diretoria WHERE nomediretoria = 'OE'

        -- CAMIL
        UNION ALL
        SELECT 'CAMIL SEDE', id FROM diretoria WHERE nomediretoria = 'CAMIL'

        -- MPPE
        UNION ALL
        SELECT 'MPPE SEDE', id FROM diretoria WHERE nomediretoria = 'MPPE'

        -- ALEPE
        UNION ALL
        SELECT 'ALEPE SEDE', id FROM diretoria WHERE nomediretoria = 'ALEPE';
        `);

    /**
     * 🔹 USER MASTER
     * ✅ sem pg, ng, tipo, cpf, nunfunc, nunvinc — esses campos não existem mais na tabela user
     */
    const hashedPassword = await bcrypt.hash('Cb1157590', 10);

    await queryRunner.query(
      `
      INSERT INTO "user" (mat, password, type_user, ativo, phone, imagem_url, omeid)
      SELECT $1, $2, $3, $4, $5, $6, id
      FROM ome
      WHERE nomeome = 'DPO SEDE';
      `,
      ['1157590', hashedPassword, 10, true, '(81)98685-4814', '/1157590.png'],
    );

    /**
     * 🔹 DADOS SGP — registros iniciais para os usuários seed
     * ✅ campos pessoais agora vivem aqui, não no user
     */
    await queryRunner.query(`
      INSERT INTO dadossgp
        (matsgp, pgsgp, nomeguerrasgp, nomecompletosgp, nomeomesgp, tiposgp,
         cpfsgp, nunfuncsgp, nunvincsgp, localapresentacaosgp, situacaosgp)
      VALUES
        ('1157590', 'CB', 'FRANCISCO', 'EMERSON FRANCISCO DA SILVA',
         'DPO SEDE', 'P', '08286667417', '3392503', '1',
         'SEDE DA OME', 'REGULAR');
    `);

    await queryRunner.query(`
      INSERT INTO tetos
        (imagem_url, sistema, nome_verba, cod_verba, valor_total,
         ttctof, ttctprc, data_inicio, data_fim, tipo_periodo, status)
      VALUES
        ('/logo_dpo.png',    'PJES','GOVERNO',   '247', 50000,  100, 100, '2026-06-01','2026-06-30','MENSAL','ABERTO'),
        ('/pe_logo.png',     'PJES','P ESCOLAR', '263', 250000, 500, 500, '2026-06-01','2026-06-30','MENSAL','ABERTO'),
        ('/mobi_logo.png',   'PJES','CTM BRT',   '255', 50000,  100, 100, '2026-06-01','2026-06-30','MENSAL','ABERTO'),
        ('/brasil_logo.png', 'PJES','FEDERAL',   '250', 12500,   25,  25, '2026-06-01','2026-06-30','MENSAL','ABERTO'),
        ('/alepe_logo.png',  'PJES','ALEPE',     '270', 5000,    10,  10, '2026-06-01','2026-06-30','MENSAL','ABERTO'),
        ('/tjpe_logo.png',   'PJES','TJPE',      '290', 25000,   50,  50, '2026-06-01','2026-06-30','MENSAL','ABERTO'),
        ('/sds_logo.png',    'PJES','SDS',       '299', 100000, 200, 200, '2026-06-01','2026-06-30','MENSAL','ABERTO');
    `);

    await queryRunner.query(`
      INSERT INTO tetos
        (imagem_url, sistema, nome_verba, cod_verba, valor_total,
         ttctof, ttctprc, data_inicio, data_fim, tipo_periodo, status)
      VALUES
        ('/logo_dpo.png',    'DIARIAS','OPS JUL',   'D247', 50000,  100, 100, '2026-06-01', '2026-06-30', 'OPERACAO','ABERTO'),
        ('/santa.png',     'DIARIAS','S.SANTA', 'D248', 250000, 500, 500, '2026-04-01', '2026-04-15', 'OPERACAO','ABERTO'),
        ('/carnaval.jpg',   'DIARIAS','CARNAVAL 2027',   'D249', 50000,  100, 100, '2027-01-10', '2027-03-10', 'OPERACAO','ABERTO'),
        ('/eleicao.png', 'DIARIAS','ELEIÇÃO 2026',   'D250', 12500,   25,  25, '2026-09-15', '2026-11-30', 'OPERACAO','ABERTO'),
        ('/natal.png', 'DIARIAS','PAPAI NOEL',   'D251', 12500,   25,  25, '2026-12-01', '2026-12-31', 'OPERACAO','ABERTO'),
        ('/turistico.jpg',  'DIARIAS','CALENDARIO TURISTICO',     'D252', 5000,    10,  10, '2027-01-01', '2027-12-31', 'OPERACAO','ABERTO'),
        ('/fogueira.png', 'DIARIAS','SÃO JOÃO 2026',   'D253', 12500,   25,  25, '2026-05-20', '2026-06-30', 'OPERACAO','ABERTO');
        
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM distribuicao;`);
    await queryRunner.query(`DELETE FROM tetos;`);
    await queryRunner.query(
      `DELETE FROM dadossgp WHERE matsgp IN ('1157590');`,
    );
    await queryRunner.query(`DELETE FROM "user" WHERE mat = '1157590';`);
    await queryRunner.query(`DELETE FROM ome;`);
    await queryRunner.query(`DELETE FROM diretoria;`);
  }
}
