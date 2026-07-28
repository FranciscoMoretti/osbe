import assert from "node:assert/strict"
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import sharp from "sharp"

import { generateStoreAssets } from "./lib/store-assets.mjs"

test("renders a flattened Chrome Web Store screenshot from a raw source", async () => {
  const repoRoot = await mkdtemp(path.join(os.tmpdir(), "osbe-assets-"))
  const extensionRoot = path.join(repoRoot, "extensions", "fixture")
  const source = path.join(extensionRoot, "store-assets", "raw", "popup.png")
  const destination = path.join(
    extensionRoot,
    "store-assets",
    "screenshots",
    "popup-1280x800.png"
  )
  const promoDestination = path.join(
    extensionRoot,
    "store-assets",
    "small-promo-440x280.png"
  )

  try {
    await mkdir(path.dirname(source), { recursive: true })
    await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 4,
        background: { r: 14, g: 165, b: 233, alpha: 0.5 }
      }
    })
      .png()
      .toFile(source)

    await generateStoreAssets(repoRoot, {
      slug: "fixture",
      store: {
        promoTiles: [
          {
            file: "store-assets/small-promo-440x280.png",
            kind: "small",
            source: "store-assets/raw/popup.png"
          }
        ],
        screenshots: [
          {
            description: "A locally generated fixture",
            file: "store-assets/screenshots/popup-1280x800.png",
            source: "store-assets/raw/popup.png",
            title: "A clear extension workflow"
          }
        ]
      }
    })

    const metadata = await sharp(await readFile(destination)).metadata()
    assert.equal(metadata.width, 1280)
    assert.equal(metadata.height, 800)
    assert.equal(metadata.hasAlpha, false)

    const promoMetadata = await sharp(
      await readFile(promoDestination)
    ).metadata()
    assert.equal(promoMetadata.width, 440)
    assert.equal(promoMetadata.height, 280)
    assert.equal(promoMetadata.hasAlpha, false)
  } finally {
    await rm(repoRoot, { recursive: true, force: true })
  }
})
