"""
Gera documentação PDF da integração Stone para o PDV Galetos.
Execute: python scripts/gerar-doc-stone.py
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from datetime import date

OUTPUT = "docs/integracao-stone.pdf"

# ─── Cores ────────────────────────────────────────────────────────────────────

STONE_GREEN   = colors.HexColor("#00a868")
STONE_DARK    = colors.HexColor("#00713f")
GRAY_900      = colors.HexColor("#111827")
GRAY_700      = colors.HexColor("#374151")
GRAY_500      = colors.HexColor("#6b7280")
GRAY_200      = colors.HexColor("#e5e7eb")
GRAY_50       = colors.HexColor("#f9fafb")
AMBER_100     = colors.HexColor("#fef3c7")
AMBER_800     = colors.HexColor("#92400e")
BLUE_50       = colors.HexColor("#eff6ff")
BLUE_800      = colors.HexColor("#1e40af")
RED_50        = colors.HexColor("#fef2f2")
RED_700       = colors.HexColor("#b91c1c")
GREEN_50      = colors.HexColor("#f0fdf4")
GREEN_700     = colors.HexColor("#15803d")
WHITE         = colors.white

# ─── Estilos ──────────────────────────────────────────────────────────────────

base = getSampleStyleSheet()

def style(name, parent="Normal", **kw):
    s = ParagraphStyle(name, parent=base[parent], **kw)
    return s

S = {
    "cover_title": style("cover_title",
        fontSize=28, leading=34, textColor=WHITE, fontName="Helvetica-Bold",
        alignment=TA_CENTER),
    "cover_sub": style("cover_sub",
        fontSize=13, leading=18, textColor=colors.HexColor("#d1fae5"),
        alignment=TA_CENTER),
    "cover_meta": style("cover_meta",
        fontSize=10, leading=14, textColor=colors.HexColor("#a7f3d0"),
        alignment=TA_CENTER),
    "h1": style("h1",
        fontSize=16, leading=22, textColor=STONE_DARK, fontName="Helvetica-Bold",
        spaceBefore=18, spaceAfter=6),
    "h2": style("h2",
        fontSize=13, leading=18, textColor=GRAY_900, fontName="Helvetica-Bold",
        spaceBefore=14, spaceAfter=4),
    "h3": style("h3",
        fontSize=11, leading=16, textColor=GRAY_700, fontName="Helvetica-Bold",
        spaceBefore=10, spaceAfter=3),
    "body": style("body",
        fontSize=10, leading=15, textColor=GRAY_700, alignment=TA_JUSTIFY,
        spaceAfter=6),
    "body_center": style("body_center",
        fontSize=10, leading=15, textColor=GRAY_700, alignment=TA_CENTER),
    "small": style("small",
        fontSize=8.5, leading=13, textColor=GRAY_500),
    "code": style("code",
        fontName="Courier", fontSize=9, leading=13, textColor=GRAY_900,
        backColor=GRAY_50, leftIndent=8, rightIndent=8,
        spaceBefore=4, spaceAfter=4),
    "bullet": style("bullet",
        fontSize=10, leading=15, textColor=GRAY_700,
        leftIndent=16, spaceAfter=3),
    "note_amber": style("note_amber",
        fontSize=9.5, leading=14, textColor=AMBER_800,
        leftIndent=10, rightIndent=10),
    "note_blue": style("note_blue",
        fontSize=9.5, leading=14, textColor=BLUE_800,
        leftIndent=10, rightIndent=10),
    "note_red": style("note_red",
        fontSize=9.5, leading=14, textColor=RED_700,
        leftIndent=10, rightIndent=10),
    "note_green": style("note_green",
        fontSize=9.5, leading=14, textColor=GREEN_700,
        leftIndent=10, rightIndent=10),
    "step_num": style("step_num",
        fontSize=14, leading=18, textColor=WHITE, fontName="Helvetica-Bold",
        alignment=TA_CENTER),
    "step_title": style("step_title",
        fontSize=11, leading=15, textColor=STONE_DARK, fontName="Helvetica-Bold"),
    "step_body": style("step_body",
        fontSize=10, leading=15, textColor=GRAY_700),
    "footer": style("footer",
        fontSize=8, leading=11, textColor=GRAY_500, alignment=TA_CENTER),
    "toc_item": style("toc_item",
        fontSize=10, leading=16, textColor=GRAY_700, leftIndent=8),
    "toc_item_sub": style("toc_item_sub",
        fontSize=9.5, leading=15, textColor=GRAY_500, leftIndent=20),
}

# ─── Componentes ──────────────────────────────────────────────────────────────

def hr(color=GRAY_200, thickness=0.5, spacebefore=6, spaceafter=6):
    return HRFlowable(width="100%", thickness=thickness, color=color,
                      spaceAfter=spaceafter, spaceBefore=spacebefore)

def spacer(h=0.3):
    return Spacer(1, h * cm)

def note(text, kind="amber"):
    colors_map = {
        "amber": (AMBER_100, AMBER_800, "⚠  "),
        "blue":  (BLUE_50,   BLUE_800,  "ℹ  "),
        "red":   (RED_50,    RED_700,   "✕  "),
        "green": (GREEN_50,  GREEN_700, "✓  "),
    }
    bg, fg, icon = colors_map[kind]
    data = [[Paragraph(f"<b>{icon}</b>{text}", S[f"note_{kind}"])]]
    t = Table(data, colWidths=[15.5 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("ROUNDEDCORNERS", [4, 4, 4, 4]),
        ("TOPPADDING",    (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING",   (0, 0), (-1, -1), 12),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 12),
        ("BOX", (0, 0), (-1, -1), 0.5, colors_map[kind][1]),
    ]))
    return t

def code_block(text):
    lines = text.strip().split("\n")
    data = [[Paragraph(line.replace(" ", "&nbsp;"), S["code"])] for line in lines]
    t = Table(data, colWidths=[15.5 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), GRAY_50),
        ("TOPPADDING",    (0, 0), (-1, -1), 1),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ("LEFTPADDING",   (0, 0), (-1, -1), 12),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 12),
        ("BOX",           (0, 0), (-1, -1), 0.5, GRAY_200),
    ]))
    return t

def field_table(rows):
    """
    rows: list of (campo, obrigatorio, descricao, exemplo)
    """
    header = [
        Paragraph("<b>Campo</b>", S["body"]),
        Paragraph("<b>Obrig.</b>", S["body_center"]),
        Paragraph("<b>Descrição</b>", S["body"]),
        Paragraph("<b>Exemplo</b>", S["small"]),
    ]
    data = [header]
    for campo, obrig, desc, ex in rows:
        data.append([
            Paragraph(f"<font name='Courier' size='9'>{campo}</font>", S["body"]),
            Paragraph("Sim" if obrig else "Não", S["body_center"]),
            Paragraph(desc, S["small"]),
            Paragraph(f"<font name='Courier' size='8'>{ex}</font>", S["small"]),
        ])
    t = Table(data, colWidths=[3.8*cm, 1.5*cm, 6.2*cm, 4*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), STONE_GREEN),
        ("TEXTCOLOR",     (0, 0), (-1, 0), WHITE),
        ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, 0), 9),
        ("ALIGN",         (1, 0), (1, -1), "CENTER"),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [WHITE, GRAY_50]),
        ("GRID",          (0, 0), (-1, -1), 0.4, GRAY_200),
    ]))
    return t

def step_card(number, title, body_paragraphs):
    num_cell  = Paragraph(str(number), S["step_num"])
    title_p   = Paragraph(title, S["step_title"])
    body_cell = [title_p] + [Paragraph(p, S["step_body"]) for p in body_paragraphs]

    inner = Table(
        [[num_cell], ],
        colWidths=[1 * cm],
    )
    t = Table(
        [[inner, body_cell]],
        colWidths=[1.2 * cm, 14.3 * cm],
    )
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (0, 0), STONE_GREEN),
        ("ALIGN",         (0, 0), (0, 0), "CENTER"),
        ("VALIGN",        (0, 0), (0, 0), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING",   (1, 0), (1, 0), 12),
        ("BOX",           (0, 0), (-1, -1), 0.5, GRAY_200),
        ("BACKGROUND",    (1, 0), (1, 0), WHITE),
    ]))
    return t

def flow_table(steps):
    """steps: list of (icone, label, desc)"""
    data = []
    for i, (icon, label, desc) in enumerate(steps):
        data.append([
            Paragraph(icon, S["body_center"]),
            Paragraph(f"<b>{label}</b><br/>{desc}", S["small"]),
        ])
        if i < len(steps) - 1:
            data.append([Paragraph("↓", S["body_center"]), Paragraph("", S["small"])])

    col_widths = [1.5 * cm, 14 * cm]
    t = Table(data, colWidths=col_widths)
    style_cmds = [
        ("ALIGN",         (0, 0), (0, -1), "CENTER"),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING",   (1, 0), (1, -1), 10),
    ]
    # Colorir linhas de conteúdo (pares)
    for i in range(0, len(data), 2):
        style_cmds.append(("BACKGROUND", (0, i), (-1, i), GRAY_50))
        style_cmds.append(("BOX", (0, i), (-1, i), 0.4, GRAY_200))
    t.setStyle(TableStyle(style_cmds))
    return t

# ─── Conteúdo ─────────────────────────────────────────────────────────────────

def build_doc():
    import os
    os.makedirs("docs", exist_ok=True)

    doc = SimpleDocTemplate(
        OUTPUT,
        pagesize=A4,
        leftMargin=2.5 * cm,
        rightMargin=2.5 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title="Integração Stone — PDV Galetos",
        author="PDV Galetos",
        subject="Documentação de configuração da maquininha Stone",
    )

    story = []

    # ── Capa ──────────────────────────────────────────────────────────────────
    cover = Table(
        [[
            Paragraph("PDV Galetos", S["cover_sub"]),
            spacer(0.3),
            Paragraph("Integração Stone", S["cover_title"]),
            spacer(0.2),
            Paragraph("Guia de Configuração da Maquininha", S["cover_sub"]),
            spacer(0.4),
            hr(color=colors.HexColor("#6ee7b7"), thickness=0.8),
            spacer(0.3),
            Paragraph(
                f"Versão 1.0  ·  {date.today().strftime('%d/%m/%Y')}  ·  Ambiente: Sandbox / Produção",
                S["cover_meta"]
            ),
        ]],
        colWidths=[15.5 * cm],
    )
    cover.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), STONE_GREEN),
        ("TOPPADDING",    (0, 0), (-1, -1), 40),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 40),
        ("LEFTPADDING",   (0, 0), (-1, -1), 30),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 30),
    ]))
    story.append(cover)
    story.append(spacer(0.8))

    # ── Sumário ────────────────────────────────────────────────────────────────
    story.append(Paragraph("Sumário", S["h1"]))
    story.append(hr())
    toc = [
        ("1", "Visão Geral", [
            ("1.1", "O que é a integração Stone"),
            ("1.2", "Pré-requisitos"),
        ]),
        ("2", "Configuração no PDV", [
            ("2.1", "Acessar a tela de Configurações"),
            ("2.2", "Campos da integração"),
            ("2.3", "Habilitando a integração"),
        ]),
        ("3", "Variáveis de Ambiente", []),
        ("4", "Configuração do Webhook", [
            ("4.1", "Registrar o endpoint no painel Stone"),
            ("4.2", "Validação de assinatura HMAC"),
        ]),
        ("5", "Fluxo de Pagamento", []),
        ("6", "Ambientes: Sandbox e Produção", []),
        ("7", "Resolução de Problemas", []),
    ]
    for num, title, subs in toc:
        story.append(Paragraph(f"{num}.  {title}", S["toc_item"]))
        for snum, stitle in subs:
            story.append(Paragraph(f"{snum}  {stitle}", S["toc_item_sub"]))
    story.append(spacer(0.6))

    # ── 1. Visão Geral ─────────────────────────────────────────────────────────
    story.append(Paragraph("1. Visão Geral", S["h1"]))
    story.append(hr())

    story.append(Paragraph("1.1 O que é a integração Stone", S["h2"]))
    story.append(Paragraph(
        "A integração Stone permite que o PDV Galetos envie transações de pagamento "
        "diretamente para a maquininha física (Pinpad/Smart Terminal Stone), sem que o "
        "operador precise digitar o valor manualmente no terminal. O fluxo é 100% "
        "integrado: ao finalizar um pedido com Débito ou Crédito, o PDV comunica o valor "
        "à Stone, que repassa para a maquininha. O cliente aproxima o cartão ou chip, e a "
        "confirmação retorna automaticamente para o PDV via webhook.",
        S["body"]
    ))
    story.append(spacer(0.2))

    story.append(Paragraph("1.2 Pré-requisitos", S["h2"]))
    prereqs = [
        ("Conta Stone ativa", "Conta Merchant ativa na Stone com credenciais OAuth2 geradas."),
        ("Maquininha vinculada", "Terminal Stone cadastrado na conta e com o número de série anotado."),
        ("PDV com acesso HTTPS", "Em produção o webhook exige HTTPS. Em desenvolvimento use ngrok."),
        ("Permissão de Admin", "Somente usuários ADMIN ou GERENTE podem editar Configurações."),
    ]
    data = [[Paragraph("<b>Requisito</b>", S["body"]), Paragraph("<b>Detalhe</b>", S["body"])]]
    for req, det in prereqs:
        data.append([Paragraph(f"✓  {req}", S["bullet"]), Paragraph(det, S["small"])])
    t = Table(data, colWidths=[5*cm, 10.5*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), STONE_DARK),
        ("TEXTCOLOR",     (0, 0), (-1, 0), WHITE),
        ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, 0), 9),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [WHITE, GRAY_50]),
        ("GRID",          (0, 0), (-1, -1), 0.4, GRAY_200),
    ]))
    story.append(t)
    story.append(spacer(0.4))

    # ── 2. Configuração no PDV ─────────────────────────────────────────────────
    story.append(Paragraph("2. Configuração no PDV", S["h1"]))
    story.append(hr())

    story.append(Paragraph("2.1 Acessar a tela de Configurações", S["h2"]))
    story.append(Paragraph(
        "No menu lateral do PDV, acesse <b>Configurações</b>. Role até a seção "
        "<b>Integração Stone (Maquininha)</b>, localizada abaixo das configurações "
        "gerais da loja.",
        S["body"]
    ))
    story.append(spacer(0.2))
    story.append(note(
        "Apenas usuários com perfil <b>ADMIN</b> ou <b>GERENTE</b> conseguem visualizar "
        "e editar as configurações Stone.",
        "blue"
    ))
    story.append(spacer(0.3))

    story.append(Paragraph("2.2 Campos da integração", S["h2"]))
    story.append(field_table([
        ("stoneEnabled",       True,  "Habilita ou desabilita a integração. Quando desativado, pagamentos com Débito/Crédito seguem o fluxo padrão sem enviar para a maquininha.", "true / false"),
        ("stoneAccountId",     True,  "ID da conta Stone (Merchant Account). Encontrado no painel Stone em Conta > Dados da conta.", "acc_AbCdEf123"),
        ("stoneClientId",      True,  "Client ID da aplicação OAuth2 registrada no painel Stone Developer.", "pdv-galetos"),
        ("stoneClientSecret",  True,  "Client Secret OAuth2. Trate como senha — não compartilhe. O campo exibe botão olho para visualizar.", "s3cr3t_xxx..."),
        ("stoneTerminalSerial",True,  "Numero de serie do terminal fisico (Pinpad ou Smart Terminal). Impresso na etiqueta traseira da maquininha.", "STN-123456789"),
    ]))
    story.append(spacer(0.3))

    story.append(Paragraph("2.3 Habilitando a integração", S["h2"]))
    steps_enable = [
        step_card(1, "Marque o checkbox "Habilitar integração Stone"",
            ["Os campos de credenciais serão exibidos logo abaixo."]),
        step_card(2, "Preencha Account ID, Client ID, Client Secret e Nº de Série",
            ["Obtenha as credenciais OAuth2 no painel Stone Developer (developers.stone.com.br).",
             "O Nº de Série está na etiqueta atrás da maquininha ou no app Stone Parceiros."]),
        step_card(3, "Clique em "Salvar configurações Stone"",
            ["As credenciais são armazenadas de forma segura no banco de dados do tenant."]),
        step_card(4, "Configure o Webhook (seção 4)",
            ["Sem o webhook, o PDV dependerá exclusivamente do polling para confirmar pagamentos."]),
    ]
    for s in steps_enable:
        story.append(KeepTogether([s, spacer(0.2)]))
    story.append(spacer(0.3))

    # ── 3. Variáveis de Ambiente ────────────────────────────────────────────────
    story.append(Paragraph("3. Variáveis de Ambiente", S["h1"]))
    story.append(hr())
    story.append(Paragraph(
        "As credenciais OAuth2 (Client ID / Secret / Account ID) são armazenadas no banco "
        "de dados por tenant. Entretanto, o segredo do webhook e a configuração de ambiente "
        "são definidos por variáveis de ambiente no arquivo <font name='Courier'>.env.local</font>.",
        S["body"]
    ))
    story.append(spacer(0.2))
    story.append(code_block(
        "# .env.local\n"
        "\n"
        "# 'true' = sandbox Stone (padrão para dev)\n"
        "# 'false' = produção Stone\n"
        "STONE_SANDBOX=true\n"
        "\n"
        "# Segredo HMAC para validar assinaturas do webhook Stone\n"
        "# Obtido ao registrar o endpoint no painel Stone\n"
        "STONE_WEBHOOK_SECRET=sua_chave_secreta_aqui"
    ))
    story.append(spacer(0.2))
    story.append(note(
        "Nunca versione o <font name='Courier'>.env.local</font> no Git. "
        "O arquivo <font name='Courier'>.env.example</font> contém os nomes das variáveis "
        "sem valores, e pode ser versionado com segurança.",
        "red"
    ))
    story.append(spacer(0.2))

    env_data = [
        [Paragraph("<b>Variável</b>", S["body"]),
         Paragraph("<b>Valores</b>", S["body"]),
         Paragraph("<b>Descrição</b>", S["body"])],
        [Paragraph("STONE_SANDBOX", S["small"]),
         Paragraph("true / false", S["small"]),
         Paragraph("Define o ambiente Stone. Use 'true' em desenvolvimento e 'false' em produção.", S["small"])],
        [Paragraph("STONE_WEBHOOK_SECRET", S["small"]),
         Paragraph("string livre", S["small"]),
         Paragraph("Chave HMAC-SHA256 usada para validar a assinatura dos webhooks enviados pela Stone.", S["small"])],
    ]
    t = Table(env_data, colWidths=[5*cm, 3*cm, 7.5*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), STONE_DARK),
        ("TEXTCOLOR",     (0, 0), (-1, 0), WHITE),
        ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, 0), 9),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [WHITE, GRAY_50]),
        ("GRID",          (0, 0), (-1, -1), 0.4, GRAY_200),
    ]))
    story.append(t)
    story.append(spacer(0.4))

    # ── 4. Webhook ─────────────────────────────────────────────────────────────
    story.append(Paragraph("4. Configuração do Webhook", S["h1"]))
    story.append(hr())
    story.append(Paragraph(
        "O webhook é o mecanismo pelo qual a Stone notifica o PDV sobre o resultado "
        "do pagamento (aprovado, recusado, cancelado). Sem ele, o PDV usa polling "
        "(consulta a cada 2 segundos), o que é menos eficiente.",
        S["body"]
    ))
    story.append(spacer(0.2))

    story.append(Paragraph("4.1 Registrar o endpoint no painel Stone", S["h2"]))
    story.append(Paragraph(
        "No painel Stone Developer, navegue até <b>Webhooks</b> e cadastre a URL:",
        S["body"]
    ))
    story.append(code_block("https://seu-dominio.com/api/stone/webhook"))
    story.append(spacer(0.2))
    story.append(Paragraph(
        "Após cadastrar, a Stone exibirá o <b>Webhook Secret</b>. Copie esse valor e "
        "adicione-o em <font name='Courier'>STONE_WEBHOOK_SECRET</font> no "
        "<font name='Courier'>.env.local</font>.",
        S["body"]
    ))
    story.append(spacer(0.2))
    story.append(note(
        "Em desenvolvimento local, utilize o <b>ngrok</b> para expor sua porta local "
        "via HTTPS: <font name='Courier'>ngrok http 3000</font>. Use a URL gerada pelo "
        "ngrok como endpoint do webhook.",
        "amber"
    ))
    story.append(spacer(0.3))

    story.append(Paragraph("4.2 Validação de assinatura HMAC", S["h2"]))
    story.append(Paragraph(
        "Cada requisição enviada pela Stone para o endpoint do webhook inclui o cabeçalho "
        "<font name='Courier'>X-Stone-Signature</font> com um hash HMAC-SHA256 do corpo da "
        "requisição. O PDV valida essa assinatura antes de processar o evento, rejeitando "
        "requisições não autenticadas com HTTP 401.",
        S["body"]
    ))
    story.append(spacer(0.2))
    story.append(code_block(
        "# Cabeçalho enviado pela Stone:\n"
        "X-Stone-Signature: sha256=<hmac_hex>"
    ))
    story.append(spacer(0.2))
    story.append(note(
        "Se o <font name='Courier'>STONE_WEBHOOK_SECRET</font> não estiver definido no "
        "<font name='Courier'>.env.local</font>, <b>todas</b> as requisições de webhook "
        "serão rejeitadas com 401. Certifique-se de reiniciar o servidor após adicionar a variável.",
        "red"
    ))
    story.append(spacer(0.4))

    # ── 5. Fluxo de Pagamento ──────────────────────────────────────────────────
    story.append(Paragraph("5. Fluxo de Pagamento", S["h1"]))
    story.append(hr())
    story.append(Paragraph(
        "Quando a integração Stone está habilitada e o operador seleciona Débito ou Crédito "
        "no PDV, o fluxo de pagamento é alterado para o seguinte:",
        S["body"]
    ))
    story.append(spacer(0.2))

    flow_steps = [
        ("💳", "Operador seleciona Débito ou Crédito",
         "No modal de pagamento, o PDV detecta o método e exibe o botão "Enviar para Maquininha"."),
        ("📡", "PDV cria transação na Stone  [POST /api/stone/transaction]",
         "O servidor chama a Stone API com o valor em centavos e o nº de série da maquininha."),
        ("📋", "Venda criada como PAGAMENTO_PENDENTE  [POST /api/stone/pending-sale]",
         "O pedido fica registrado no banco com status pendente. O estoque ainda não é decrementado."),
        ("⏳", "PDV exibe tela "Aguardando aprovação na maquininha"",
         "O cliente vê a tela de espera. O PDV realiza polling a cada 2 segundos (máx. 2 minutos)."),
        ("🏧", "Cliente passa o cartão na maquininha",
         "A Stone processa o pagamento no terminal físico."),
        ("✅", "Stone envia confirmação via Webhook  [POST /api/stone/webhook]",
         "O PDV valida a assinatura HMAC, atualiza o pagamento, decrementa estoque e confirma a venda como AGUARDANDO."),
        ("🖨️", "PDV exibe sucesso e habilita impressão do recibo",
         "O operador pode imprimir o cupom normalmente."),
    ]
    story.append(flow_table(flow_steps))
    story.append(spacer(0.3))
    story.append(note(
        "Se o pagamento for <b>recusado ou cancelado</b> pela maquininha, a Stone envia um "
        "webhook com status negativo. O PDV cancela automaticamente a venda pendente e "
        "exibe a tela de erro com opção de tentar novamente ou cancelar.",
        "amber"
    ))
    story.append(spacer(0.4))

    # ── 6. Ambientes ───────────────────────────────────────────────────────────
    story.append(Paragraph("6. Ambientes: Sandbox e Produção", S["h1"]))
    story.append(hr())

    env_rows = [
        [Paragraph("<b>Configuração</b>", S["body"]),
         Paragraph("<b>Sandbox</b>", S["body_center"]),
         Paragraph("<b>Produção</b>", S["body_center"])],
        [Paragraph("STONE_SANDBOX", S["small"]),
         Paragraph("true", S["body_center"]),
         Paragraph("false", S["body_center"])],
        [Paragraph("URL base Stone API", S["small"]),
         Paragraph("sandbox.openbank.stone.com.br", S["small"]),
         Paragraph("openbank.stone.com.br", S["small"])],
        [Paragraph("Credenciais OAuth2", S["small"]),
         Paragraph("Geradas no painel Sandbox", S["small"]),
         Paragraph("Geradas no painel Producao", S["small"])],
        [Paragraph("Transacoes reais", S["small"]),
         Paragraph("Nao (simuladas)", S["body_center"]),
         Paragraph("Sim", S["body_center"])],
        [Paragraph("Maquininha necessaria", S["small"]),
         Paragraph("Nao (simulador)", S["body_center"]),
         Paragraph("Sim", S["body_center"])],
    ]
    t = Table(env_rows, colWidths=[5*cm, 5.25*cm, 5.25*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), STONE_DARK),
        ("TEXTCOLOR",     (0, 0), (-1, 0), WHITE),
        ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, 0), 9),
        ("ALIGN",         (1, 0), (-1, -1), "CENTER"),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [WHITE, GRAY_50]),
        ("GRID",          (0, 0), (-1, -1), 0.4, GRAY_200),
    ]))
    story.append(t)
    story.append(spacer(0.3))
    story.append(note(
        "Para mudar de Sandbox para Produção, altere "
        "<font name='Courier'>STONE_SANDBOX=false</font> no "
        "<font name='Courier'>.env.local</font> e reinicie o servidor. "
        "Atualize também as credenciais no PDV (Configurações) para as credenciais de produção.",
        "blue"
    ))
    story.append(spacer(0.4))

    # ── 7. Resolução de Problemas ──────────────────────────────────────────────
    story.append(Paragraph("7. Resolução de Problemas", S["h1"]))
    story.append(hr())

    problems = [
        (
            '"Integração Stone não configurada"',
            "A integração não está habilitada ou algum campo obrigatório está vazio.",
            "Verifique em Configurações se o checkbox está marcado e todos os campos estão preenchidos: Account ID, Client ID, Client Secret e Nº de Série."
        ),
        (
            '"Stone auth falhou (401)"',
            "As credenciais OAuth2 (Client ID / Secret) estão incorretas ou expiradas.",
            "Regenere as credenciais no painel Stone Developer e atualize os campos em Configurações."
        ),
        (
            "Webhook retorna 401",
            "O STONE_WEBHOOK_SECRET não está definido ou é diferente do registrado na Stone.",
            "Verifique o .env.local e certifique-se de que o valor bate com o exibido no painel Stone ao registrar o webhook. Reinicie o servidor após alterar."
        ),
        (
            "Venda fica em PAGAMENTO_PENDENTE para sempre",
            "O webhook não chegou (URL incorreta, ngrok expirado, HTTPS ausente) e o polling atingiu o timeout de 2 minutos.",
            "Verifique a URL do webhook no painel Stone. Em dev, confirme que o ngrok está ativo. A venda pode ser cancelada manualmente em Vendas > Cancelar."
        ),
        (
            "Maquininha não exibe a cobrança",
            "O Nº de Série está incorreto ou a maquininha está offline/desvinculada da conta.",
            "Confirme o serial no app Stone Parceiros. Verifique se a maquininha está conectada à internet e vinculada à mesma conta do Account ID configurado."
        ),
        (
            "Erro 500 na rota /api/pdv/settings",
            "O Prisma Client não foi regerado após a migração do schema (DLL travado pelo Next.js).",
            "Pare o servidor Next.js, execute 'npx dotenv-cli -e .env.local -- npx prisma generate' e reinicie o servidor."
        ),
    ]

    for prob, cause, sol in problems:
        data = [
            [Paragraph(f"<b>Problema:</b> {prob}", S["body"])],
            [Paragraph(f"<b>Causa:</b> {cause}", S["small"])],
            [Paragraph(f"<b>Solucao:</b> {sol}", S["small"])],
        ]
        t = Table(data, colWidths=[15.5*cm])
        t.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, 0), GRAY_50),
            ("BACKGROUND",    (0, 1), (-1, -1), WHITE),
            ("TOPPADDING",    (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING",   (0, 0), (-1, -1), 10),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 10),
            ("BOX",           (0, 0), (-1, -1), 0.5, GRAY_200),
            ("LINEBELOW",     (0, 0), (-1, 0), 0.4, GRAY_200),
        ]))
        story.append(KeepTogether([t, spacer(0.25)]))

    story.append(spacer(0.4))
    story.append(hr(color=STONE_GREEN, thickness=1))
    story.append(spacer(0.2))
    story.append(Paragraph(
        f"PDV Galetos  ·  Integração Stone v1.0  ·  Gerado em {date.today().strftime('%d/%m/%Y')}",
        S["footer"]
    ))
    story.append(Paragraph(
        "Este documento é de uso interno. Não compartilhe as credenciais OAuth2 ou o Webhook Secret.",
        S["footer"]
    ))

    doc.build(story)
    print(f"PDF gerado: {OUTPUT}")

if __name__ == "__main__":
    build_doc()
