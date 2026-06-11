/**
 * Backup do banco de dados MySQL
 * Uso: npx dotenv -e .env.local -- npx tsx scripts/backup-db.ts
 *
 * Gera um dump em backups/pdv_galetos-YYYY-MM-DD_HH-mm.sql.gz
 * Mantém apenas os últimos 7 backups.
 */

import { execSync } from "child_process"
import { mkdirSync, readdirSync, unlinkSync } from "fs"
import { join } from "path"
import { createGzip } from "zlib"
import { createWriteStream } from "fs"
import { pipeline } from "stream/promises"
import { Readable } from "stream"

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error("DATABASE_URL não definida")
  process.exit(1)
}

// Extrai credenciais da URL: mysql://user:pass@host:port/dbname
const match = DATABASE_URL.match(
  /mysql:\/\/([^:]+):([^@]*)@([^:]+):(\d+)\/(.+)/
)
if (!match) {
  console.error("DATABASE_URL em formato inválido")
  process.exit(1)
}

const [, user, password, host, port, database] = match

const BACKUP_DIR = join(process.cwd(), "backups")
const MAX_BACKUPS = 7

const now = new Date()
const pad = (n: number) => String(n).padStart(2, "0")
const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`
const filename = `${database}-${timestamp}.sql.gz`
const filepath = join(BACKUP_DIR, filename)

mkdirSync(BACKUP_DIR, { recursive: true })

console.log(`\n📦 Iniciando backup de "${database}"...`)

try {
  // Executa mysqldump e comprime com gzip
  const env = { ...process.env, MYSQL_PWD: password }
  const dumpCmd = `mysqldump -u ${user} -h ${host} -P ${port} --single-transaction --routines --triggers ${database}`
  const dumpBuffer = execSync(dumpCmd, { env, maxBuffer: 512 * 1024 * 1024 })

  const readable = Readable.from(dumpBuffer)
  const gzip = createGzip()
  const output = createWriteStream(filepath)
  await pipeline(readable, gzip, output)

  const sizeKb = Math.round(dumpBuffer.length / 1024)
  console.log(`✅ Backup salvo em: ${filepath} (${sizeKb} KB descomprimido)`)

  // Remove backups antigos mantendo apenas os últimos MAX_BACKUPS
  const files = readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith(database) && f.endsWith(".sql.gz"))
    .sort()
    .reverse()

  const toDelete = files.slice(MAX_BACKUPS)
  for (const f of toDelete) {
    unlinkSync(join(BACKUP_DIR, f))
    console.log(`🗑  Backup antigo removido: ${f}`)
  }

  console.log(`\n📊 Total de backups mantidos: ${Math.min(files.length, MAX_BACKUPS)}/${MAX_BACKUPS}`)
} catch (err) {
  console.error("❌ Erro ao executar backup:", err)
  process.exit(1)
}
