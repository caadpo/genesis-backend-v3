
# IMPORTAÇÕES
# =============================================================================

import sys
import json
import os
from datetime import datetime

# Bibliotecas do ReportLab para criação do PDF
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.lib.units import cm

from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer
)

from reportlab.lib.styles import (
    getSampleStyleSheet,
    ParagraphStyle
)

from reportlab.lib.enums import (
    TA_CENTER,
    TA_LEFT,
    TA_RIGHT
)

# =============================================================================
# CONFIGURAÇÃO DE CORES
# =============================================================================
# ALTERE AQUI para mudar as cores do PDF

VERDE_CABEC = colors.HexColor('#08462e')   # Cor principal do cabeçalho
BRANCO      = colors.white                 # Texto branco
CINZA_LINHA = colors.HexColor('#F1F8E9')  # Fundo alternado das linhas
PRETO       = colors.black                 # Texto preto
CINZA_BORDA = colors.HexColor('#BDBDBD')  # Cor das bordas

# =============================================================================
# CONFIGURAÇÃO DA PÁGINA
# =============================================================================
# ALTERE AQUI para mudar tamanho/orientação da página

PAGE_W, PAGE_H = landscape(A4)  # Página A4 na horizontal
MARGIN = 1 * cm                 # Margem geral do documento

# =============================================================================
# FUNÇÃO: FORMATAR DATA E HORA
# =============================================================================
# Responsável por transformar:
# 2025-05-20 + 08:00 + 18:00
# em:
# 20/05/2025 08:00 às 18:00
# =============================================================================

def fmt_data_hora(data: str, hi: str, hf: str) -> str:
    try:
        d = datetime.strptime(data, '%Y-%m-%d').strftime('%d/%m/%Y')
    except Exception:
        d = data

    return f"{d} {hi[:5]} às {hf[:5]}"

# =============================================================================
# FUNÇÃO PRINCIPAL DE GERAÇÃO DO PDF
# =============================================================================

def build_pdf(payload: dict, mat_usuario: str, output_path: str) -> None:

    # =========================================================================
    # EXTRAÇÃO DOS DADOS PRINCIPAIS
    # =========================================================================

    escalas = payload.get('escalas', [])

    nome_ome = escalas[0].get('nomeome_escala', '') if escalas else ''
    sistema  = escalas[0].get('sistema', '') if escalas else ''
    nome_op  = escalas[0].get('nomeOperacao', '') if escalas else ''
    nome_evento = escalas[0].get('nomeEvento', '') if escalas else ''
    cod_op   = escalas[0].get('cod_op', '') if escalas else ''

    operacao_id = payload.get('operacaoId', '')

    # Data atual da geração do PDF
    gerado_em = datetime.now().strftime('%d/%m/%Y %H:%M:%S')

    # =========================================================================
    # CONFIGURAÇÃO DOS ESTILOS DE TEXTO
    # =========================================================================
    # ALTERE AQUI para mudar fontes, alinhamentos e tamanhos

    styles = getSampleStyleSheet()

    # Texto centralizado padrão
    s_center = ParagraphStyle(
        'c',
        parent=styles['Normal'],
        alignment=TA_CENTER,
        fontSize=8
    )

    # Título da seção
    s_sect = ParagraphStyle(
        's',
        parent=styles['Normal'],
        fontSize=10,
        fontName='Helvetica-Bold',
        textColor=VERDE_CABEC
    )

    # Texto do resumo final
    s_resumo = ParagraphStyle(
        'r',
        parent=styles['Normal'],
        fontSize=8,
        alignment=TA_RIGHT,
        textColor=colors.HexColor('#37474F')
    )

    # =========================================================================
    # FUNÇÃO DE CABEÇALHO E RODAPÉ
    # =========================================================================
    # ALTERE AQUI para:
    # - mudar logos
    # - mudar textos institucionais
    # - mudar rodapé
    # =========================================================================

    def header_footer(canvas, doc):

        canvas.saveState()

        # ---------------------------------------------------------------------
        # CAMINHO DAS LOGOS
        # ---------------------------------------------------------------------

        base_dir = os.path.dirname(os.path.abspath(__file__))

        logo_l = os.path.join(base_dir, 'logo_pmpe.jpg')
        logo_r = os.path.join(base_dir, 'logo_pe.jpg')

        # Tamanho das logos
        logo_h = logo_w = 2.0 * cm

        # ---------------------------------------------------------------------
        # LOGO ESQUERDA
        # ---------------------------------------------------------------------

        if os.path.exists(logo_l):
            canvas.drawImage(
                logo_l,
                MARGIN,
                PAGE_H - MARGIN - logo_h,
                width=logo_w,
                height=logo_h,
                preserveAspectRatio=True,
                mask='auto'
            )

        # ---------------------------------------------------------------------
        # LOGO DIREITA
        # ---------------------------------------------------------------------

        if os.path.exists(logo_r):
            canvas.drawImage(
                logo_r,
                PAGE_W - MARGIN - logo_w,
                PAGE_H - MARGIN - logo_h,
                width=logo_w,
                height=logo_h,
                preserveAspectRatio=True,
                mask='auto'
            )

        # Centro da página
        cx = PAGE_W / 2

        # Posição vertical inicial
        y = PAGE_H - MARGIN - 0.35 * cm

        # ---------------------------------------------------------------------
        # TEXOS DO CABEÇALHO
        # ---------------------------------------------------------------------
        # ALTERE AQUI os textos institucionais

        canvas.setFont('Helvetica-Bold', 10)
        canvas.setFillColor(PRETO)

        canvas.drawCentredString(
            cx,
            y,
            'POLÍCIA MILITAR DE PERNAMBUCO'
        )

        y -= 0.45 * cm

        canvas.setFont('Helvetica-Bold', 9)

        canvas.drawCentredString(
            cx,
            y,
            'QUARTEL DO COMANDO GERAL'
        )

        y -= 0.42 * cm

        canvas.drawCentredString(
            cx,
            y,
            'DIRETORIA DE PLANEJAMENTO OPERACIONAL'
        )


        # ---------------------------------------------------------------------
        # RODAPÉ
        # ---------------------------------------------------------------------
        # ALTERE AQUI o texto do rodapé

        canvas.setFont('Helvetica', 7)
        canvas.setFillColor(colors.HexColor('#616161'))

        ry = MARGIN - 0.3 * cm

        # Texto esquerdo do rodapé
        canvas.drawString(
            MARGIN,
            ry,
            f"Gerado em: {gerado_em}  |  Mat.: {mat_usuario}"
        )

        # Número da página
        canvas.drawRightString(
            PAGE_W - MARGIN,
            ry,
            f"Página {doc.page}"
        )

        canvas.restoreState()

    # =========================================================================
    # CONFIGURAÇÃO DO DOCUMENTO PDF
    # =========================================================================
    # ALTERE AQUI:
    # - margens
    # - orientação
    # - tamanho da página
    # =========================================================================

    doc = SimpleDocTemplate(
        output_path,
        pagesize=landscape(A4),

        leftMargin=MARGIN,
        rightMargin=MARGIN,

        topMargin=3.8 * cm,
        bottomMargin=1.8 * cm,
    )

    # Lista que armazenará os componentes do PDF
    story = []

    # =========================================================================
    # TÍTULO PRINCIPAL
    # =========================================================================

    story.append(
        Paragraph(f"{sistema}_{nome_ome} | {nome_evento}, {nome_op} - COP:{cod_op}", s_sect)
    )

    story.append(
        Spacer(1, 0.3 * cm)
    )

    # =========================================================================
    # CABEÇALHOS DA TABELA
    # =========================================================================
    # ALTERE AQUI os nomes das colunas

    col_headers = [
        '#',
        'IDENTIFICAÇÃO',
        'TELEFONE',
        'DATA E HORA',
        'APRESENTAÇÃO',
        'FUNÇÃO | COTA',
        'VIATURA',
        'ANOTAÇÕES'
    ]

    # =========================================================================
    # TAMANHO DAS COLUNAS
    # =========================================================================
    # ALTERE AQUI para aumentar/diminuir colunas

    usable_w = PAGE_W - 2 * MARGIN

    col_widths = [
        usable_w * 0.03,  # Número

        usable_w * 0.27,  # Identificação

        usable_w * 0.10,  # Telefone

        usable_w * 0.16,  # Data/Hora

        usable_w * 0.11,  # Apresentação

        usable_w * 0.09,  # Função/Cota

        usable_w * 0.09,  # Viatura

        usable_w * 0.15,  # Anotações
    ]

    # =========================================================================
    # CRIAÇÃO DA TABELA
    # =========================================================================

    data = [col_headers]

    # =========================================================================
    # LOOP DAS ESCALAS
    # =========================================================================
    # ALTERE AQUI para mudar informações exibidas nas linhas

    for idx, e in enumerate(escalas, start=1):

        # ---------------------------------------------------------------------
        # IDENTIFICAÇÃO
        # ---------------------------------------------------------------------

        identificacao = (
            f"{e.get('pg_escala','')} "
            f"{e.get('mat_escala','')} "
            f"{e.get('ng_escala','')} "
            f"{e.get('nomeome_escala','')} - "
            f"{e.get('situacao','')}"
        )

        # ---------------------------------------------------------------------
        # TELEFONE
        # ---------------------------------------------------------------------

        telefone = e.get('phone') or '-'

        # ---------------------------------------------------------------------
        # DATA/HORA
        # ---------------------------------------------------------------------

        data_hora = fmt_data_hora(
            e.get('dataInicio', ''),
            e.get('horaInicio', ''),
            e.get('horaFim', '')
        )

        # ---------------------------------------------------------------------
        # APRESENTAÇÃO
        # ---------------------------------------------------------------------

        apresent = e.get(
            'localApresentacao',
            'SEDE DA OME'
        )

        # ---------------------------------------------------------------------
        # FUNÇÃO E COTA
        # ---------------------------------------------------------------------

        funcao_cota = (
            f"{e.get('funcao','')} | "
            f"{e.get('cota_escala','')} Ct"
        )

        # ---------------------------------------------------------------------
        # VIATURA
        # ---------------------------------------------------------------------

        viatura = (
            e.get('viatura') or {}
        ).get('patrimonio', '-') or '-'

        # ---------------------------------------------------------------------
        # ANOTAÇÕES
        # ---------------------------------------------------------------------

        anotacoes = e.get('anotacoes') or '-'

        # ---------------------------------------------------------------------
        # ADICIONA LINHA NA TABELA
        # ---------------------------------------------------------------------

        data.append([
            Paragraph(str(idx), s_center),
            Paragraph(identificacao, s_center),
            Paragraph(telefone, s_center),
            Paragraph(data_hora, s_center),
            Paragraph(apresent, s_center),
            Paragraph(funcao_cota, s_center),
            Paragraph(viatura, s_center),
            Paragraph(anotacoes, s_center),
        ])

    # =========================================================================
    # CORES ALTERNADAS NAS LINHAS
    # =========================================================================

    n_rows = len(data)

    row_colors = [
        (
            'BACKGROUND',
            (0, i),
            (-1, i),
            CINZA_LINHA if i % 2 == 0 else BRANCO
        )
        for i in range(1, n_rows)
    ]

    # =========================================================================
    # CONFIGURAÇÃO DA TABELA
    # =========================================================================

    table = Table(
        data,
        colWidths=col_widths,
        repeatRows=1
    )

    # =========================================================================
    # ESTILO DA TABELA
    # =========================================================================
    # ALTERE AQUI:
    # - cores
    # - bordas
    # - fontes
    # - alinhamentos
    # =========================================================================

    table.setStyle(TableStyle([

        # CABEÇALHO
        ('BACKGROUND', (0, 0), (-1, 0), VERDE_CABEC),
        ('TEXTCOLOR', (0, 0), (-1, 0), BRANCO),

        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),

        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, 0), 'MIDDLE'),

        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 0), (-1, 0), 6),

        # CORPO DA TABELA
        ('FONTSIZE', (0, 1), (-1, -1), 7.5),

        ('VALIGN', (0, 1), (-1, -1), 'MIDDLE'),

        ('TOPPADDING', (0, 1), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 5),

        # GRID
        ('GRID', (0, 0), (-1, -1), 0.4, CINZA_BORDA),

        # BORDA EXTERNA
        ('BOX', (0, 0), (-1, -1), 0.8, VERDE_CABEC),

        # LINHAS ALTERNADAS
        *row_colors,
    ]))

    # Adiciona tabela ao documento
    story.append(table)

    # =========================================================================
    # RESUMO / TOTALIZADOR
    # =========================================================================
    # ALTERE AQUI os cálculos finais
    # =========================================================================

    story.append(
        Spacer(1, 0.4 * cm)
    )

    # Total de cotas oficiais
    tot_of = sum(
        e.get('cota_escala', 0)
        for e in escalas
        if e.get('tipo_escala') == 'O'
    )

    # Total de cotas praças
    tot_pr = sum(
        e.get('cota_escala', 0)
        for e in escalas
        if e.get('tipo_escala') == 'P'
    )

    # Total geral
    tot_all = sum(
        e.get('cota_escala', 0)
        for e in escalas
    )

    resumo = (
        
        f"<b>Oficiais (O):</b> {tot_of}   "
        f"<b>Praças (P):</b> {tot_pr}   "
        
    )

    story.append(
        Paragraph(resumo, s_resumo)
    )

    # =========================================================================
    # GERAÇÃO FINAL DO PDF
    # =========================================================================

    doc.build(
        story,
        onFirstPage=header_footer,
        onLaterPages=header_footer
    )

# =============================================================================
# EXECUÇÃO PRINCIPAL
# =============================================================================

if __name__ == '__main__':

    # Verifica se os parâmetros foram enviados
    if len(sys.argv) < 4:

        print(
            'Uso: python generate_escala_pdf.py <json> <mat> <output>',
            file=sys.stderr
        )

        sys.exit(1)

    # =========================================================================
    # LEITURA DOS PARÂMETROS
    # =========================================================================

    payload = json.loads(sys.argv[1])

    mat_usuario = sys.argv[2]

    output_pdf = sys.argv[3]

    # =========================================================================
    # CHAMA FUNÇÃO DE GERAÇÃO
    # =========================================================================

    build_pdf(
        payload,
        mat_usuario,
        output_pdf
    )

    # =========================================================================
    # MENSAGEM FINAL
    # =========================================================================

    print(f'PDF gerado em: {output_pdf}')