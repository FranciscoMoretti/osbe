import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"

const SCREENSHOT_WIDTH = 1280
const SCREENSHOT_HEIGHT = 800
const PROMO_DIMENSIONS = {
  marquee: { height: 560, width: 1400 },
  small: { height: 280, width: 440 }
}

export async function generateStoreAssets(repoRoot, extension) {
  for (const asset of await renderStoreAssets(repoRoot, extension)) {
    await mkdir(path.dirname(asset.destination), { recursive: true })
    await writeFile(asset.destination, asset.contents)
  }
}

export async function renderStoreAssets(repoRoot, extension) {
  const extensionRoot = path.join(repoRoot, "extensions", extension.slug)
  const assets = []

  for (const screenshot of extension.store.screenshots) {
    if (!screenshot.source) continue

    const source = path.join(extensionRoot, screenshot.source)
    const destination = path.join(extensionRoot, screenshot.file)
    assets.push({
      contents: await renderScreenshot(source, screenshot),
      destination,
      file: screenshot.file
    })
  }

  for (const promoTile of extension.store.promoTiles ?? []) {
    if (!promoTile.source) continue

    const source = path.join(extensionRoot, promoTile.source)
    const destination = path.join(extensionRoot, promoTile.file)
    assets.push({
      contents: await renderPromoTile(source, promoTile.kind),
      destination,
      file: promoTile.file
    })
  }

  return assets
}

async function renderScreenshot(source, screenshot) {
  const framedImage = await sharp(source)
    .resize({
      width: 1160,
      height: 580,
      fit: "contain",
      background: "#ffffff"
    })
    .png()
    .toBuffer()

  const title = escapeXml(screenshot.title ?? "")
  const description = escapeXml(screenshot.description ?? "")
  const header = Buffer.from(`
    <svg width="${SCREENSHOT_WIDTH}" height="${SCREENSHOT_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect width="1280" height="800" fill="#f8fafc"/>
      <rect x="0" y="0" width="1280" height="160" fill="#ffffff"/>
      <rect x="0" y="158" width="1280" height="2" fill="#0ea5e9"/>
      <text x="60" y="72" fill="#0f172a" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="34" font-weight="700">${title}</text>
      <text x="60" y="116" fill="#64748b" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="20">${description}</text>
      <rect x="48" y="184" width="1184" height="592" rx="16" fill="#ffffff" stroke="#dbeafe" stroke-width="2"/>
    </svg>
  `)

  return sharp({
    create: {
      width: SCREENSHOT_WIDTH,
      height: SCREENSHOT_HEIGHT,
      channels: 3,
      background: "#f8fafc"
    }
  })
    .composite([
      { input: header, left: 0, top: 0 },
      { input: framedImage, left: 60, top: 190 }
    ])
    .png({ colours: 256 })
    .removeAlpha()
    .toBuffer()
}

async function renderPromoTile(source, kind) {
  const dimensions = PROMO_DIMENSIONS[kind]
  if (!dimensions) {
    throw new Error(`Unsupported promotional tile kind: ${kind}`)
  }

  return sharp(source)
    .resize({
      width: dimensions.width,
      height: dimensions.height,
      fit: "contain",
      background: "#f8fafc"
    })
    .flatten({ background: "#f8fafc" })
    .png({ colours: 256 })
    .toBuffer()
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
}
