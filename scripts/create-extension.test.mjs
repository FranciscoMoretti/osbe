import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import test from "node:test"

import { validateExtension } from "./lib/extensions.mjs"

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)
const generatorPath = path.join(repoRoot, "scripts", "create-extension.mjs")

test("generated extension uses the shared foundation and valid store icon", async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "osbe-extension-"))

  try {
    await mkdir(path.join(temporaryRoot, "extensions"), { recursive: true })
    await mkdir(path.join(temporaryRoot, ".github", "workflows"), {
      recursive: true
    })
    await mkdir(path.join(temporaryRoot, "docs", "assets"), { recursive: true })
    await cp(
      path.join(repoRoot, "templates"),
      path.join(temporaryRoot, "templates"),
      { recursive: true }
    )
    await cp(
      path.join(repoRoot, "docs", "assets", "osbe-icon-base.png"),
      path.join(temporaryRoot, "docs", "assets", "osbe-icon-base.png")
    )
    await writeFile(
      path.join(temporaryRoot, "extensions", "catalog.json"),
      '{"extensions":[]}\n'
    )

    const result = spawnSync(
      process.execPath,
      [generatorPath, "link-cleaner", "OSBE Link Cleaner"],
      {
        encoding: "utf8",
        env: { ...process.env, OSBE_REPO_ROOT: temporaryRoot }
      }
    )

    assert.equal(result.status, 0, result.stderr)

    const extensionRoot = path.join(temporaryRoot, "extensions", "link-cleaner")
    const popup = await readFile(
      path.join(extensionRoot, "src", "popup.tsx"),
      "utf8"
    )
    assert.match(popup, /OSBE Link Cleaner/)
    assert.doesNotMatch(popup, /\{\{.*displayName.*\}\}/)

    const storeIcon = await readFile(
      path.join(extensionRoot, "store-assets", "store-icon-128.png")
    )
    assert.equal(storeIcon.readUInt32BE(16), 128)
    assert.equal(storeIcon.readUInt32BE(20), 128)

    const catalog = JSON.parse(
      await readFile(
        path.join(temporaryRoot, "extensions", "catalog.json"),
        "utf8"
      )
    )
    assert.deepEqual(catalog.extensions[0], {
      slug: "link-cleaner",
      packageName: "@osbe/link-cleaner",
      workflow: "submit-link-cleaner.yml",
      secretName: "LINK_CLEANER_SUBMIT_KEYS"
    })

    assert.deepEqual(
      await validateExtension(temporaryRoot, catalog.extensions[0]),
      ["link-cleaner: store-assets/screenshots has no PNG files"]
    )

    const localUiPath = path.join(extensionRoot, "src", "components", "ui")
    await mkdir(localUiPath, { recursive: true })
    await writeFile(path.join(localUiPath, "button.tsx"), "export {}\n")
    assert.ok(
      (await validateExtension(temporaryRoot, catalog.extensions[0])).some(
        (error) =>
          error.includes("shared UI primitives must live in packages/ui")
      )
    )
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true })
  }
})
