import { mkdir, writeFile } from "fs/promises"
import path from "path"
import { randomBytes } from "crypto"

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "text/xml",
  "application/xml",
])

const EXT_BY_MIME: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "text/xml": ".xml",
  "application/xml": ".xml",
}

/**
 * Detecta o tipo real do arquivo pelos primeiros bytes (magic number).
 * Retorna null se o tipo não for reconhecido.
 */
function detectMimeByMagic(bytes: Uint8Array): string | null {
  // PDF: %PDF (25 50 44 46)
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return "application/pdf"
  }
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg"
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return "image/png"
  }
  // WebP: RIFF????WEBP
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return "image/webp"
  }
  // XML: <?xml  (3C 3F 78 6D 6C) ou BOM UTF-8 (EF BB BF) + <?xml
  const xmlStart =
    (bytes[0] === 0x3c && bytes[1] === 0x3f) ||                           // <?
    (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf && bytes[3] === 0x3c) // BOM + <
  if (xmlStart) return "text/xml"

  return null
}

export async function validateInvoiceFileContent(file: File): Promise<string | null> {
  if (!ALLOWED_MIME.has(file.type)) {
    return "Arquivo deve ser PDF, XML de NF-e ou imagem (JPG, PNG, WEBP)"
  }
  if (file.size === 0) return "Arquivo está vazio"
  if (file.size > MAX_SIZE) return "Arquivo deve ter no máximo 10 MB"

  // Lê os primeiros 12 bytes para verificar o magic number
  const slice = file.slice(0, 12)
  const arrayBuf = await slice.arrayBuffer()
  const bytes = new Uint8Array(arrayBuf)
  const detectedMime = detectMimeByMagic(bytes)

  if (!detectedMime) {
    return "Tipo de arquivo não reconhecido. Envie PDF, XML ou imagem."
  }

  // Normaliza: jpg e jpeg são equivalentes
  const declared = file.type === "image/jpg" ? "image/jpeg" : file.type
  const detected = detectedMime === "image/jpg" ? "image/jpeg" : detectedMime

  if (declared !== detected) {
    return `O arquivo parece ser ${detected} mas foi declarado como ${declared}. Envie o arquivo correto.`
  }

  return null
}

/** Mantém compatibilidade com chamadas síncronas legadas */
export function validateInvoiceFile(file: File): string | null {
  if (!ALLOWED_MIME.has(file.type)) {
    return "Arquivo deve ser PDF, XML de NF-e ou imagem (JPG, PNG, WEBP)"
  }
  if (file.size > MAX_SIZE) return "Arquivo deve ter no máximo 10 MB"
  return null
}

export async function saveInvoiceFile(
  tenantId: string,
  file: File
): Promise<{ fileUrl: string; fileMime: string }> {
  // Validação completa incluindo magic number
  const error = await validateInvoiceFileContent(file)
  if (error) throw new Error(error)

  const ext = EXT_BY_MIME[file.type] ?? (path.extname(file.name) || ".bin")
  const safeName = `${Date.now()}-${randomBytes(8).toString("hex")}${ext}`
  const dir = path.join(process.cwd(), "public", "uploads", "nfs-compra", tenantId)
  await mkdir(dir, { recursive: true })

  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(path.join(dir, safeName), buffer)

  return {
    fileUrl: `/uploads/nfs-compra/${tenantId}/${safeName}`,
    fileMime: file.type,
  }
}
