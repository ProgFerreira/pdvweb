import { execSync } from "child_process"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uiKitRoot = path.join(__dirname, "..")
const projectRoot = path.join(uiKitRoot, "..")
const distDir = path.join(uiKitRoot, "dist")
const inputCss = path.join(uiKitRoot, "styles", "globals.css")
const outputCss = path.join(distDir, "theme.min.css")
const configJs = path.join(uiKitRoot, "tailwind.config.js")

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true })
}

const tailwindBin = path.join(
  projectRoot,
  "node_modules",
  "tailwindcss",
  "lib",
  "cli.js"
)

if (!fs.existsSync(tailwindBin)) {
  console.error("Tailwind não encontrado. Execute npm install na raiz do projeto PDV.")
  process.exit(1)
}

const cmd = [
  "node",
  JSON.stringify(tailwindBin),
  "-c",
  JSON.stringify(configJs),
  "-i",
  JSON.stringify(inputCss),
  "-o",
  JSON.stringify(outputCss),
  "--minify",
].join(" ")

console.log("Gerando CSS estático...")
execSync(cmd, { cwd: projectRoot, stdio: "inherit", shell: true })
console.log(`\nPronto: ${outputCss}`)
