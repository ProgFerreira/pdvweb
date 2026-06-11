/**
 * Integração NFC-e via Focus NFe (https://focusnfe.com.br)
 *
 * Variáveis de ambiente necessárias (configuradas via /configuracoes):
 *   FISCAL_FOCUS_TOKEN — token de acesso à API Focus NFe
 *   FISCAL_FOCUS_URL   — (opcional) padrão: https://api.focusnfe.com.br
 *   FISCAL_FOCUS_SANDBOX — "true" para usar homologação
 *
 * Campos do Settings obrigatórios:
 *   fiscalEnabled, fiscalCnpj, fiscalIE, fiscalCRT, fiscalSerie, fiscalAmbiente, fiscalFocusToken
 */

import { prisma } from "@/lib/prisma"

export type NfceEmitPayload = {
  saleId: string
  orderNumber: number
  tenantId: string
  total: number
  cpfCliente?: string | null
  items: {
    name: string
    quantity: number
    unitPrice: number
    ncm?: string | null
    cfop?: string | null
    cst?: string | null
    origin?: string | number | null
  }[]
}

export type NfceEmitResult = {
  status: "AUTORIZADA" | "PENDENTE" | "REJEITADA" | "NAO_EMITIR"
  key?: string
  number?: string
  xmlUrl?: string
  pdfUrl?: string
  message?: string
}

type FocusNfceResponse = {
  status: string
  chave_nfe?: string
  numero?: string
  caminho_xml_nota_fiscal?: string
  caminho_danfe?: string
  mensagem_sefaz?: string
  erros?: { codigo: string; mensagem: string }[]
}

export async function emitNfce(payload: NfceEmitPayload): Promise<NfceEmitResult> {
  const settings = await prisma.settings.findUnique({
    where: { tenantId: payload.tenantId },
    select: {
      fiscalEnabled: true,
      fiscalCnpj: true,
      fiscalIE: true,
      fiscalCRT: true,
      fiscalSerie: true,
      fiscalAmbiente: true,
      fiscalFocusToken: true,
    },
  })

  if (!settings?.fiscalEnabled || !settings.fiscalFocusToken || !settings.fiscalCnpj) {
    return { status: "NAO_EMITIR", message: "NFC-e não configurada" }
  }

  const {
    fiscalCnpj,
    fiscalIE,
    fiscalCRT,
    fiscalSerie,
    fiscalAmbiente,
    fiscalFocusToken,
  } = settings

  const baseUrl =
    process.env.FISCAL_FOCUS_URL ||
    (fiscalAmbiente === "homologacao"
      ? "https://homologacao.focusnfe.com.br"
      : "https://api.focusnfe.com.br")

  // Focus NFe usa referência única por emitente
  const ref = `pdv-${payload.tenantId.slice(-8)}-${payload.orderNumber}`

  const body = {
    natureza_operacao: "Venda ao Consumidor",
    forma_pagamento: "0",
    tipo_documento: "1",
    serie: fiscalSerie ?? 1,
    emitente: {
      cnpj: fiscalCnpj.replace(/\D/g, ""),
      inscricao_estadual: fiscalIE ?? undefined,
      codigo_regime_tributario: fiscalCRT ?? "1",
    },
    ...(payload.cpfCliente
      ? { cpf_destinatario: payload.cpfCliente.replace(/\D/g, "") }
      : {}),
    items: payload.items.map((item, idx) => ({
      numero_item: idx + 1,
      codigo_produto: String(idx + 1),
      descricao: item.name,
      codigo_ncm: item.ncm?.replace(/\D/g, "") || "22021000",
      cfop: item.cfop || "5102",
      unidade_comercial: "UN",
      quantidade_comercial: item.quantity,
      valor_unitario_comercial: item.unitPrice.toFixed(4),
      valor_bruto: (item.quantity * item.unitPrice).toFixed(2),
      icms_situacao_tributaria: item.cst || "400",
      icms_origem: item.origin != null ? String(item.origin) : "0",
      pis_situacao_tributaria: "07",
      cofins_situacao_tributaria: "07",
    })),
    formas_pagamento: [
      {
        forma_pagamento: "01",
        valor_pagamento: payload.total.toFixed(2),
      },
    ],
  }

  try {
    const res = await fetch(`${baseUrl}/v2/nfce?ref=${ref}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${fiscalFocusToken}:`).toString("base64")}`,
      },
      body: JSON.stringify(body),
    })

    const data = (await res.json()) as FocusNfceResponse

    if (res.status === 201 || res.status === 200) {
      const isAuthorized =
        data.status === "autorizado" || data.status === "autorizada"

      return {
        status: isAuthorized ? "AUTORIZADA" : "PENDENTE",
        key: data.chave_nfe,
        number: data.numero,
        xmlUrl: data.caminho_xml_nota_fiscal
          ? `${baseUrl}${data.caminho_xml_nota_fiscal}`
          : undefined,
        pdfUrl: data.caminho_danfe
          ? `${baseUrl}${data.caminho_danfe}`
          : undefined,
        message: data.mensagem_sefaz,
      }
    }

    const errorMsg =
      data.erros?.map((e) => `${e.codigo}: ${e.mensagem}`).join("; ") ||
      data.mensagem_sefaz ||
      `HTTP ${res.status}`

    return { status: "REJEITADA", message: errorMsg }
  } catch (e) {
    return {
      status: "REJEITADA",
      message: e instanceof Error ? e.message : "Falha na comunicação com Focus NFe",
    }
  }
}

/** Consulta status de NFC-e já emitida */
export async function consultarNfce(
  tenantId: string,
  ref: string
): Promise<FocusNfceResponse | null> {
  const settings = await prisma.settings.findUnique({
    where: { tenantId },
    select: { fiscalFocusToken: true, fiscalAmbiente: true },
  })
  if (!settings?.fiscalFocusToken) return null

  const baseUrl =
    process.env.FISCAL_FOCUS_URL ||
    (settings.fiscalAmbiente === "homologacao"
      ? "https://homologacao.focusnfe.com.br"
      : "https://api.focusnfe.com.br")

  try {
    const res = await fetch(`${baseUrl}/v2/nfce?ref=${ref}`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${settings.fiscalFocusToken}:`).toString("base64")}`,
      },
    })
    if (!res.ok) return null
    return (await res.json()) as FocusNfceResponse
  } catch {
    return null
  }
}

/** Cancela uma NFC-e já emitida (dentro do prazo SEFAZ) */
export async function cancelarNfce(
  tenantId: string,
  ref: string,
  justificativa: string
): Promise<{ ok: boolean; message?: string }> {
  const settings = await prisma.settings.findUnique({
    where: { tenantId },
    select: { fiscalFocusToken: true, fiscalAmbiente: true },
  })
  if (!settings?.fiscalFocusToken) return { ok: false, message: "Token fiscal não configurado" }

  const baseUrl =
    process.env.FISCAL_FOCUS_URL ||
    (settings.fiscalAmbiente === "homologacao"
      ? "https://homologacao.focusnfe.com.br"
      : "https://api.focusnfe.com.br")

  try {
    const res = await fetch(`${baseUrl}/v2/nfce?ref=${ref}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${settings.fiscalFocusToken}:`).toString("base64")}`,
      },
      body: JSON.stringify({ justificativa }),
    })
    const data = (await res.json()) as FocusNfceResponse
    return { ok: res.ok, message: data.mensagem_sefaz }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Erro ao cancelar NFC-e" }
  }
}
