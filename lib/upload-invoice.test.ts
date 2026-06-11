import { describe, it, expect } from "vitest"
import { validateInvoiceFile, validateInvoiceFileContent } from "./upload-invoice"

// Helper: cria um File com bytes específicos
function makeFile(bytes: number[], mimeType: string, name = "test"): File {
  const buffer = new Uint8Array(bytes)
  return new File([buffer], name, { type: mimeType })
}

// Magic numbers reais
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e] // %PDF-1.
const JPEG_MAGIC = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]
const WEBP_MAGIC = [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]
const XML_MAGIC = [0x3c, 0x3f, 0x78, 0x6d, 0x6c, 0x20, 0x76, 0x65, 0x72, 0x73, 0x69, 0x6f] // <?xml versio
const FAKE_BYTES = [0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b]

// ─── validateInvoiceFile (síncrono — apenas MIME e tamanho) ────────────────────

describe("validateInvoiceFile (síncrono)", () => {
  it("aceita PDF", () => {
    expect(validateInvoiceFile(makeFile(PDF_MAGIC, "application/pdf"))).toBeNull()
  })
  it("aceita JPEG", () => {
    expect(validateInvoiceFile(makeFile(JPEG_MAGIC, "image/jpeg"))).toBeNull()
  })
  it("aceita PNG", () => {
    expect(validateInvoiceFile(makeFile(PNG_MAGIC, "image/png"))).toBeNull()
  })
  it("aceita WebP", () => {
    expect(validateInvoiceFile(makeFile(WEBP_MAGIC, "image/webp"))).toBeNull()
  })
  it("aceita XML", () => {
    expect(validateInvoiceFile(makeFile(XML_MAGIC, "text/xml"))).toBeNull()
  })
  it("rejeita tipo não permitido (mp4)", () => {
    const err = validateInvoiceFile(makeFile(FAKE_BYTES, "video/mp4"))
    expect(err).not.toBeNull()
    expect(err).toMatch(/PDF|imagem|XML/i)
  })
  it("rejeita arquivo acima de 10 MB", () => {
    const bigBytes = new Array(10 * 1024 * 1024 + 1).fill(0x25)
    const err = validateInvoiceFile(makeFile(bigBytes, "application/pdf"))
    expect(err).not.toBeNull()
    expect(err).toMatch(/10 MB/i)
  })
})

// ─── validateInvoiceFileContent (assíncrono — magic number) ───────────────────

describe("validateInvoiceFileContent (magic number)", () => {
  it("aceita PDF com magic correto", async () => {
    const err = await validateInvoiceFileContent(makeFile(PDF_MAGIC, "application/pdf"))
    expect(err).toBeNull()
  })

  it("aceita JPEG com magic correto", async () => {
    const err = await validateInvoiceFileContent(makeFile(JPEG_MAGIC, "image/jpeg"))
    expect(err).toBeNull()
  })

  it("aceita PNG com magic correto", async () => {
    const err = await validateInvoiceFileContent(makeFile(PNG_MAGIC, "image/png"))
    expect(err).toBeNull()
  })

  it("aceita WebP com magic correto", async () => {
    const err = await validateInvoiceFileContent(makeFile(WEBP_MAGIC, "image/webp"))
    expect(err).toBeNull()
  })

  it("aceita XML com magic correto", async () => {
    const err = await validateInvoiceFileContent(makeFile(XML_MAGIC, "text/xml"))
    expect(err).toBeNull()
  })

  it("rejeita arquivo declarado como PDF mas com bytes de JPEG", async () => {
    const err = await validateInvoiceFileContent(makeFile(JPEG_MAGIC, "application/pdf"))
    expect(err).not.toBeNull()
    expect(err).toMatch(/image\/jpeg.*application\/pdf/i)
  })

  it("rejeita arquivo declarado como PNG mas com bytes aleatórios", async () => {
    const err = await validateInvoiceFileContent(makeFile(FAKE_BYTES, "image/png"))
    expect(err).not.toBeNull()
    expect(err).toMatch(/não reconhecido/i)
  })

  it("rejeita arquivo com MIME type não permitido", async () => {
    const err = await validateInvoiceFileContent(makeFile(FAKE_BYTES, "video/mp4"))
    expect(err).not.toBeNull()
  })

  it("rejeita arquivo vazio", async () => {
    const err = await validateInvoiceFileContent(makeFile([], "application/pdf"))
    expect(err).not.toBeNull()
    expect(err).toMatch(/vazio/i)
  })
})
