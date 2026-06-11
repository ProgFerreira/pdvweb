import { apiError } from "@/lib/utils"

export async function withApiHandler<T>(
  handler: () => Promise<T | Response>
): Promise<Response> {
  try {
    const result = await handler()
    if (result instanceof Response) return result
    return Response.json(result)
  } catch (error) {
    console.error("[API]", error)
    const raw =
      error instanceof Error ? error.message : "Erro interno do servidor"
    const needsReauth =
      raw === "Sessão sem tenant" || raw.includes("Sessão sem tenant")
    return apiError(
      needsReauth ? "Sessão inválida. Faça login novamente." : raw,
      needsReauth ? 401 : 500
    )
  }
}
