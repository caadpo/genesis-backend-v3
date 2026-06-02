# =============================================================================
# IMPORTAÇÕES
# =============================================================================

import sys
import json
import os
from datetime import datetime

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

# =============================================================================
# CORES
# =============================================================================

VERDE_CABEC = colors.HexColor('#08462e')
BRANCO      = colors.white
CINZA_LINHA = colors.Color(241/255, 248/255, 233/255, alpha=0.45)
PRETO       = colors.black
CINZA_BORDA = colors.HexColor('#BDBDBD')

# =============================================================================
# PÁGINA
# =============================================================================

PAGE_W, PAGE_H = landscape(A4)
MARGIN = 1 * cm

# =============================================================================
# HELPERS
# =============================================================================

def valor_por_cota(sistema: str, tipo: str) -> float:
    """
    Retorna o valor unitário de cada cota conforme sistema e tipo.
    """
    s = (sistema or '').upper().strip()
    t = (tipo or '').upper().strip()

    if s == 'PJES':
        return 300.0 if t == 'O' else 200.0

    if s == 'DIARIAS':
        return 180.0

    # Sistema desconhecido → retorna 0 para não esconder o problema
    return 0.0


def fmt_brl(value: float) -> str:
    """
    Formata float para moeda brasileira: R$ 1.500,00
    """
    return f"R$ {value:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')


def fmt_dt(val) -> str:
    if not val or val == '-':
        return '-'
    try:
        return datetime.fromisoformat(str(val)).strftime('%d/%m/%Y %H:%M')
    except Exception:
        return str(val)

# =============================================================================
# BUILD PDF
# =============================================================================

def build_pdf(payload: dict, mat_usuario: str, output_path: str) -> None:

    nome_evento     = payload.get('nome_evento', '')
    qtd_of          = payload.get('qtd_of_evento', 0)
    qtd_prc         = payload.get('qtd_prc_evento', 0)
    status          = payload.get('status_evento', '')
    total_cotas_of  = payload.get('totalCotasOficiais', 0)
    total_cotas_prc = payload.get('totalCotasPracas', 0)
    ome             = payload.get('ome', {})
    teto            = payload.get('teto', {})
    usuarios        = payload.get('usuarios', [])
    sistema         = (teto.get('sistema') or '').upper().strip()

    criado_por   = payload.get('criado_por')   or '-'
    homologado_por = payload.get('homologado_por') or '-'
    homologado_em  = payload.get('homologado_em')
    pago_por     = payload.get('pago_por')     or '-'
    pago_em      = payload.get('pago_em')

    gerado_em = datetime.now().strftime('%d/%m/%Y %H:%M:%S')

    # =========================================================================
    # AGRUPA POR MAT (garante unicidade mesmo se o backend mandar duplicatas)
    # =========================================================================

    agrupado: dict[str, dict] = {}

    for u in usuarios:
        mat = str(u.get('mat') or '')
        if mat not in agrupado:
            agrupado[mat] = {
                'mat':         mat,
                'nomeCompleto': u.get('nomeCompleto') or '-',
                'nomeOme':     u.get('nomeOme')      or '-',
                'tipo':        (u.get('tipo') or '-').upper().strip(),
                'banco':       u.get('banco')        or '-',
                'agencia':     u.get('agencia')      or '-',
                'conta':       u.get('conta')        or '-',
                'cpf':         u.get('cpf')          or '-',
                'totalCotas':  0,
            }
        agrupado[mat]['totalCotas'] += int(u.get('totalCotas') or 0)

    usuarios_agrupados = sorted(
        agrupado.values(),
        key=lambda x: (x['nomeOme'], x['nomeCompleto'])
    )

    # =========================================================================
    # CÁLCULO DO VALOR TOTAL DO EVENTO
    # =========================================================================

    valor_total_of  = 0.0
    valor_total_prc = 0.0

    for u in usuarios_agrupados:
        vunit = valor_por_cota(sistema, u['tipo'])
        val   = vunit * u['totalCotas']
        if u['tipo'] == 'O':
            valor_total_of  += val
        else:
            valor_total_prc += val

    valor_total_geral = valor_total_of + valor_total_prc

    # =========================================================================
    # ESTILOS
    # =========================================================================

    styles = getSampleStyleSheet()

    s_center = ParagraphStyle(
        'c', parent=styles['Normal'], alignment=TA_CENTER, fontSize=7.5
    )
    s_left = ParagraphStyle(
        'l', parent=styles['Normal'], alignment=TA_LEFT, fontSize=7.5
    )
    s_sect = ParagraphStyle(
        's', parent=styles['Normal'], fontSize=8,
        fontName='Helvetica-Bold', textColor=VERDE_CABEC
    )
    s_resumo = ParagraphStyle(
        'r', parent=styles['Normal'], fontSize=8,
        alignment=TA_RIGHT, textColor=colors.HexColor('#37474F')
    )
    s_info = ParagraphStyle(
        'i', parent=styles['Normal'], fontSize=7.5,
        textColor=colors.HexColor('#37474F')
    )
    s_valor = ParagraphStyle(
        'v', parent=styles['Normal'], fontSize=8,
        fontName='Helvetica-Bold',
        textColor=VERDE_CABEC,
        alignment=TA_CENTER
    )

    # =========================================================================
    # CABEÇALHO / RODAPÉ
    # =========================================================================

    def header_footer(canvas, doc):
        canvas.saveState()

        base_dir = os.path.dirname(os.path.abspath(__file__))

        # Marca d'água
        watermark = os.path.join(base_dir, 'logo_dpo.png')
        if not os.path.exists(watermark):
            watermark = os.path.join(
                base_dir, '..', '..', 'escala', 'scripts', 'logo_dpo.png'
            )

        if os.path.exists(watermark):
            canvas.setFillAlpha(0.08)
            wm_w = wm_h = 13 * cm
            canvas.drawImage(
                watermark,
                (PAGE_W - wm_w) / 2, (PAGE_H - wm_h) / 2,
                width=wm_w, height=wm_h,
                preserveAspectRatio=True, mask='auto'
            )
            canvas.setFillAlpha(1)

        # Logos
        escala_dir = os.path.join(base_dir, '..', '..', 'escala', 'scripts')
        logo_l = os.path.join(escala_dir, 'logo_pmpe.jpg')
        logo_r = os.path.join(escala_dir, 'logo_pe.jpg')
        if not os.path.exists(logo_l):
            logo_l = os.path.join(base_dir, 'logo_pmpe.jpg')
        if not os.path.exists(logo_r):
            logo_r = os.path.join(base_dir, 'logo_pe.jpg')

        logo_h = logo_w = 1.5 * cm

        if os.path.exists(logo_l):
            canvas.drawImage(
                logo_l, MARGIN, PAGE_H - MARGIN - logo_h,
                width=logo_w, height=logo_h,
                preserveAspectRatio=True, mask='auto'
            )
        if os.path.exists(logo_r):
            canvas.drawImage(
                logo_r, PAGE_W - MARGIN - logo_w, PAGE_H - MARGIN - logo_h,
                width=logo_w, height=logo_h,
                preserveAspectRatio=True, mask='auto'
            )

        cx = PAGE_W / 2
        y  = PAGE_H - MARGIN - 0.25 * cm

        canvas.setFont('Helvetica-Bold', 12)
        canvas.setFillColor(PRETO)
        canvas.drawCentredString(cx, y, 'POLÍCIA MILITAR DE PERNAMBUCO')
        y -= 0.45 * cm
        canvas.drawCentredString(cx, y, 'QUARTEL DO COMANDO GERAL')
        y -= 0.42 * cm
        canvas.drawCentredString(cx, y, 'DIRETORIA DE PLANEJAMENTO OPERACIONAL')

        canvas.setFont('Helvetica', 7)
        canvas.setFillColor(colors.HexColor('#616161'))
        ry = MARGIN - 0.3 * cm
        canvas.drawString(
            MARGIN, ry,
            f"Gerado em: {gerado_em}  |  Mat.: {mat_usuario}"
        )
        canvas.drawRightString(PAGE_W - MARGIN, ry, f"Página {doc.page}")

        canvas.restoreState()

    # =========================================================================
    # DOCUMENTO
    # =========================================================================

    doc = SimpleDocTemplate(
        output_path,
        pagesize=landscape(A4),
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=2.8 * cm,
        bottomMargin=1 * cm,
    )

    story = []
    usable_w = PAGE_W - 2 * MARGIN

    # =========================================================================
    # TÍTULO
    # =========================================================================

    titulo_esq = Paragraph(f"{teto.get('sistema','')} | {teto.get('nome_verba','')} - {ome.get('nomeOme', '')} : {nome_evento}",s_sect),
    titulo_vlr = Paragraph(f"Valor: {fmt_brl(valor_total_geral)}",s_sect),
    criado = Paragraph(f"<b>Criado por:</b> {criado_por}", s_info),
    homologado = Paragraph(f"<b>Homologado por:</b> {homologado_por} ({fmt_dt(homologado_em)})",s_info),
    pago = Paragraph(f"<b>Pago por:</b> {pago_por} ({fmt_dt(pago_em)})",s_info),

    titulo_dir = Paragraph(
    "<b>Sistema Gênesis</b>",
    ParagraphStyle(
        'g',
        parent=styles['Normal'],
        alignment=TA_RIGHT,
        fontSize=8,
        fontName='Helvetica-Bold',
        textColor=VERDE_CABEC
    )
    )
    # coluna esquerda com 2 linhas
    bloco_esq = Table(
    [
        [titulo_esq],
        [titulo_vlr],
        [criado],
        [homologado],
        [pago]
    ],
    colWidths=[usable_w * 0.85]
    )

    bloco_esq.setStyle(TableStyle([
    ('LEFTPADDING',   (0, 0), (-1, -1), 0),
    ('RIGHTPADDING',  (0, 0), (-1, -1), 0),
    ('TOPPADDING',    (0, 0), (-1, -1), 0),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))

    header_tbl = Table(
    [[bloco_esq, titulo_dir]],
    colWidths=[usable_w * 0.85, usable_w * 0.15]
    )
    header_tbl.setStyle(TableStyle([
    ('VALIGN',        (0, 0), (-1, -1), 'TOP'),
    ('LEFTPADDING',   (0, 0), (-1, -1), 0),
    ('RIGHTPADDING',  (0, 0), (-1, -1), 0),
    ('TOPPADDING',    (0, 0), (-1, -1), 0),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))

    story.append(header_tbl)
    story.append(Spacer(1, 0.2 * cm))


    # =========================================================================
    # TÍTULO CENTRALIZADO
    # =========================================================================

    titulo_prestacao = Paragraph(
    f"<b>PRESTAÇÃO DE CONTAS | {sistema}</b>",
    ParagraphStyle(
        'titulo_prestacao',
        parent=styles['Normal'],
        alignment=TA_CENTER,
        fontSize=12,
        leading=14,
        fontName='Helvetica-Bold',
        textColor=VERDE_CABEC,
        spaceAfter=8,
        )
    )

    story.append(titulo_prestacao)

    # =========================================================================
    # TABELA PRINCIPAL
    # =========================================================================

    col_headers = [
        '#',
        'MAT',
        'NOME COMPLETO',
        'OME',
        'TIPO',
        'COTAS',
        'VALOR',
        'BANCO',
        'AGÊNCIA',
        'CONTA',
        'CPF',
    ]

    col_widths = [
        usable_w * 0.03,   # #
        usable_w * 0.07,   # MAT
        usable_w * 0.20,   # NOME
        usable_w * 0.14,   # OME
        usable_w * 0.04,   # TIPO
        usable_w * 0.05,   # COTAS
        usable_w * 0.09,   # VALOR
        usable_w * 0.09,   # BANCO
        usable_w * 0.07,   # AGÊNCIA
        usable_w * 0.13,   # CONTA
        usable_w * 0.09,   # CPF
    ]

    data = [col_headers]

    for idx, u in enumerate(usuarios_agrupados, start=1):
        cotas  = u['totalCotas']
        vunit  = valor_por_cota(sistema, u['tipo'])
        valor  = vunit * cotas

        data.append([
            Paragraph(str(idx),             s_center),
            Paragraph(u['mat'],             s_center),
            Paragraph(u['nomeCompleto'],    s_left),
            Paragraph(u['nomeOme'],         s_center),
            Paragraph(u['tipo'],            s_center),
            Paragraph(str(cotas),           s_center),
            Paragraph(fmt_brl(valor),       s_center),
            Paragraph(u['banco'],           s_center),
            Paragraph(u['agencia'],         s_center),
            Paragraph(u['conta'],           s_center),
            Paragraph(u['cpf'],             s_center),
        ])

    # Linhas alternadas
    n_rows = len(data)
    row_colors = [
        ('BACKGROUND', (0, i), (-1, i), CINZA_LINHA if i % 2 == 0 else BRANCO)
        for i in range(1, n_rows)
    ]

    table = Table(data, colWidths=col_widths, repeatRows=1)
    table.setStyle(TableStyle([
        # Cabeçalho
        ('BACKGROUND',    (0, 0), (-1, 0), VERDE_CABEC),
        ('TEXTCOLOR',     (0, 0), (-1, 0), BRANCO),
        ('FONTNAME',      (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE',      (0, 0), (-1, 0), 8),
        ('ALIGN',         (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN',        (0, 0), (-1, 0), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 3),
        ('TOPPADDING',    (0, 0), (-1, 0), 3),
        # Corpo
        ('FONTSIZE',      (0, 1), (-1, -1), 7.5),
        ('VALIGN',        (0, 1), (-1, -1), 'MIDDLE'),
        ('TOPPADDING',    (0, 1), (-1, -1), 1),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 1),
        # Grid
        ('GRID',          (0, 0), (-1, -1), 0.4, CINZA_BORDA),
        ('BOX',           (0, 0), (-1, -1), 0.8, VERDE_CABEC),
        *row_colors,
    ]))

    story.append(table)
    story.append(Spacer(1, 0.4 * cm))

    # =========================================================================
    # RODAPÉ DE TOTAIS
    # =========================================================================

    resumoOf = (
        f"<b>Oficiais (O):</b> {total_cotas_of}"
    )
    resumoPrc = (
        f"<b>Praças (P):</b> {total_cotas_prc}"
    )
    story.append(Paragraph(resumoOf, s_resumo))
    story.append(Paragraph(resumoPrc, s_resumo))

    # =========================================================================
    # GERA
    # =========================================================================

    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)


# =============================================================================
# EXECUÇÃO
# =============================================================================

if __name__ == '__main__':
    if len(sys.argv) < 4:
        print(
            'Uso: python generate_evento_pdf.py <json> <mat> <output>',
            file=sys.stderr
        )
        sys.exit(1)

    build_pdf(json.loads(sys.argv[1]), sys.argv[2], sys.argv[3])
    print(f'PDF gerado em: {sys.argv[3]}')