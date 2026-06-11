export async function openPrintWindow(saleId: string) {
  const res = await fetch(`/api/print/${saleId}`)
  const json = await res.json()
  const url = json.url ?? json.data?.url
  if (!url) {
    throw new Error(json.error ?? "Erro ao gerar link de impressão")
  }
  window.open(url, "_blank")
}
