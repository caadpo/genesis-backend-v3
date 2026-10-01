import ExcelJS from 'exceljs';

export interface LinhaPlanilha {
  linha: number; // número real da linha na planilha (para mensagens de erro)
  dados: Record<string, any>;
}

const MAPA_COLUNAS: Record<string, string> = {
  sistema: 'sistema',
  operacaoid: 'operacaoId',
  operacao_id: 'operacaoId',
  'id da operacao': 'operacaoId',
  'id da operação': 'operacaoId',
  usuarioid: 'usuarioId',
  usuario_id: 'usuarioId',
  'id do usuario': 'usuarioId',
  'id do usuário': 'usuarioId',
  datainicio: 'dataInicio',
  data_inicio: 'dataInicio',
  'data de inicio': 'dataInicio',
  'data de início': 'dataInicio',
  horainicio: 'horaInicio',
  hora_inicio: 'horaInicio',
  'hora de inicio': 'horaInicio',
  'hora de início': 'horaInicio',
  horafim: 'horaFim',
  hora_fim: 'horaFim',
  'hora de termino': 'horaFim',
  'hora de término': 'horaFim',
  'hora de fim': 'horaFim',
  funcao: 'funcao',
  função: 'funcao',
  localapresentacao: 'localApresentacao',
  local_apresentacao: 'localApresentacao',
  'local de apresentacao': 'localApresentacao',
  'local de apresentação': 'localApresentacao',
  situacao: 'situacao',
  situação: 'situacao',
  anotacoes: 'anotacoes',
  anotações: 'anotacoes',
  viaturaid: 'viaturaId',
  viatura_id: 'viaturaId',
  'id da viatura': 'viaturaId',
};

function normalizarChave(chave: string): string {
  return chave
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

// ExcelJS pode devolver Date, número (raro), string, ou objetos ricos
// (richText / fórmula com { result }) dependendo de como a célula foi
// preenchida/formatada. Esta função sempre extrai um valor "simples".
function extrairValor(cell: ExcelJS.Cell): any {
  const v = cell.value;
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;

  if (typeof v === 'object') {
    if ('richText' in (v as any)) {
      return (v as any).richText.map((rt: any) => rt.text).join('');
    }
    if ('result' in (v as any)) {
      return (v as any).result; // fórmula: usa o valor calculado
    }
    if ('text' in (v as any)) {
      return (v as any).text; // hyperlink, por ex.
    }
    return String(v);
  }

  return v;
}

export async function lerPlanilhaEscalas(
  buffer: Buffer,
): Promise<LinhaPlanilha[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('A planilha não contém nenhuma aba');

  const headerRow = sheet.getRow(1);
  if (!headerRow || headerRow.cellCount === 0) {
    throw new Error('A planilha está vazia ou não possui cabeçalho');
  }

  const colunaParaCampo = new Map<number, string>();
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const chaveNormalizada = normalizarChave(String(extrairValor(cell) ?? ''));
    const chaveDto = MAPA_COLUNAS[chaveNormalizada];
    if (chaveDto) colunaParaCampo.set(colNumber, chaveDto);
  });

  if (colunaParaCampo.size === 0) {
    throw new Error(
      'Não foi possível reconhecer nenhuma coluna esperada no cabeçalho da planilha',
    );
  }

  const resultado: LinhaPlanilha[] = [];
  const totalLinhas = sheet.rowCount;

  for (let rowNumber = 2; rowNumber <= totalLinhas; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    if (!row || row.cellCount === 0) continue;

    const dados: Record<string, any> = {};
    let linhaTemConteudo = false;

    colunaParaCampo.forEach((campo, colNumber) => {
      const valor = extrairValor(row.getCell(colNumber));
      if (valor !== null && valor !== undefined && valor !== '') {
        dados[campo] = valor;
        linhaTemConteudo = true;
      }
    });

    if (!linhaTemConteudo) continue; // pula linha totalmente vazia

    if (dados.dataInicio !== undefined)
      dados.dataInicio = normalizarData(dados.dataInicio);
    if (dados.horaInicio !== undefined)
      dados.horaInicio = normalizarHora(dados.horaInicio);
    if (dados.horaFim !== undefined)
      dados.horaFim = normalizarHora(dados.horaFim);
    if (typeof dados.sistema === 'string')
      dados.sistema = dados.sistema.trim().toUpperCase();
    if (typeof dados.funcao === 'string')
      dados.funcao = dados.funcao.trim().toUpperCase();

    resultado.push({ linha: rowNumber, dados });
  }

  return resultado;
}

function normalizarData(valor: any): string {
  if (valor instanceof Date) {
    // ExcelJS interpreta datas de planilha como UTC — usar getUTC* evita
    // que a data "ande" um dia para trás/frente por causa do fuso local.
    const y = valor.getUTCFullYear();
    const m = String(valor.getUTCMonth() + 1).padStart(2, '0');
    const d = String(valor.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof valor === 'string') {
    const s = valor.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); // DD/MM/AAAA
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  }
  return String(valor ?? '');
}

function normalizarHora(valor: any): string {
  if (valor instanceof Date) {
    const h = String(valor.getUTCHours()).padStart(2, '0');
    const min = String(valor.getUTCMinutes()).padStart(2, '0');
    return `${h}:${min}`;
  }
  if (typeof valor === 'number') {
    // fração de dia (caso a célula não tenha sido interpretada como Date)
    const totalMin = Math.round(valor * 24 * 60);
    const h = String(Math.floor(totalMin / 60)).padStart(2, '0');
    const min = String(totalMin % 60).padStart(2, '0');
    return `${h}:${min}`;
  }
  if (typeof valor === 'string') {
    const m = valor.trim().match(/^(\d{1,2}):(\d{2})/);
    if (m) return `${m[1].padStart(2, '0')}:${m[2]}`;
  }
  return String(valor ?? '');
}
