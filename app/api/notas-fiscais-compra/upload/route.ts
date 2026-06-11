import { NextRequest } from "next/server"
import { requirePermission, isSession } from "@/lib/api-auth"
import { getTenantId } from "@/lib/prisma-tenant"
import { saveInvoiceFile } from "@/lib/upload-invoice"
import { withApiHandler } from "@/lib/api-handler"
import { apiError } from "@/lib/utils"

export async function POST(req: NextRequest) {
  return withApiHandler(async () => {
    const session = await requirePermission("notas_fiscais.crud")
    if (!isSession(session)) return session
    const tenantId = await getTenantId(session)

    const formData = await req.formData()
    const file = formData.get("file")
    if (!file || !(file instanceof File)) {
      return apiError("Arquivo não enviado", 400)
    }

    try {
      const saved = await saveInvoiceFile(tenantId, file)
      return saved
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar arquivo"
      return apiError(msg, 400)
    }
  })
}
