import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createRequire } from "node:module"
import sharp from "sharp"

const require = createRequire(import.meta.url)
const toIco = require("to-ico")

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.join(__dirname, "..")
const src = path.join(appRoot, "public/logo.png")

if (!fs.existsSync(src)) {
  console.error("Missing source: public/logo.png")
  process.exit(1)
}

const base = () => sharp(src).ensureAlpha()

async function main() {
  const pub = path.join(appRoot, "public")
  const appDir = path.join(appRoot, "app")

  const b16 = await base().resize(16, 16).png().toBuffer()
  const b32 = await base().resize(32, 32).png().toBuffer()
  const b48 = await base().resize(48, 48).png().toBuffer()
  const icoBuf = await toIco([b16, b32, b48])
  fs.writeFileSync(path.join(appDir, "favicon.ico"), icoBuf)

  await base().resize(512, 512).png().toFile(path.join(appDir, "icon.png"))
  await base()
    .resize(180, 180)
    .png()
    .toFile(path.join(appDir, "apple-icon.png"))

  await base()
    .resize(16, 16)
    .png()
    .toFile(path.join(pub, "favicon-16x16.png"))
  await base()
    .resize(32, 32)
    .png()
    .toFile(path.join(pub, "favicon-32x32.png"))
  await base()
    .resize(192, 192)
    .png()
    .toFile(path.join(pub, "android-chrome-192x192.png"))
  await base()
    .resize(512, 512)
    .png()
    .toFile(path.join(pub, "android-chrome-512x512.png"))

  const m = 512
  const inner = Math.round(m * 0.8)
  const innerBuf = await base()
    .resize(inner, inner, { fit: "fill" })
    .png()
    .toBuffer()
  const off = Math.floor((m - inner) / 2)
  await sharp({
    create: {
      width: m,
      height: m,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: innerBuf, left: off, top: off }])
    .png()
    .toFile(path.join(pub, "maskable-icon-512x512.png"))

  console.log("Favicon and PWA icon assets written from public/logo.png")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
