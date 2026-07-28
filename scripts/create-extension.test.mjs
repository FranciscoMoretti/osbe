import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import test from "node:test"

import { readExtensionRegistry, validateExtension } from "./lib/extensions.mjs"

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)
const generatorPath = path.join(repoRoot, "scripts", "create-extension.mjs")

const archetypes = [
  {
    files: ["src/popup.tsx"],
    slug: "link-cleaner",
    surface: "popup"
  },
  {
    files: ["src/background.ts", "src/tabs/result.tsx"],
    slug: "page-archive",
    surface: "action-result"
  },
  {
    files: ["src/popup.tsx", "src/options.tsx"],
    slug: "tab-manager",
    surface: "dashboard"
  }
]

test("generates each supported extension archetype", async (context) => {
  for (const archetype of archetypes) {
    await context.test(archetype.surface, async () => {
      const temporaryRoot = await createTemporaryRepo()

      try {
        const displayName = `OSBE ${archetype.slug
          .split("-")
          .map((part) => part[0].toUpperCase() + part.slice(1))
          .join(" ")}`
        const result = spawnSync(
          process.execPath,
          [
            generatorPath,
            archetype.slug,
            displayName,
            "--surface",
            archetype.surface
          ],
          {
            encoding: "utf8",
            env: { ...process.env, OSBE_REPO_ROOT: temporaryRoot }
          }
        )

        assert.equal(result.status, 0, result.stderr)
        assert.match(result.stdout, new RegExp(`Surface: ${archetype.surface}`))

        const extensionRoot = path.join(
          temporaryRoot,
          "extensions",
          archetype.slug
        )
        const generatedSurface = (
          await Promise.all(
            archetype.files.map((file) =>
              readFile(path.join(extensionRoot, file), "utf8")
            )
          )
        ).join("\n")
        assert.match(generatedSurface, new RegExp(displayName))
        assert.doesNotMatch(generatedSurface, /\{\{.*\}\}/)

        const definition = JSON.parse(
          await readFile(
            path.join(extensionRoot, "extension.config.json"),
            "utf8"
          )
        )
        assert.equal(definition.surface, archetype.surface)

        const iconSource = await readFile(
          path.join(extensionRoot, "assets", "icon-source.svg"),
          "utf8"
        )
        assert.match(iconSource, new RegExp(`${displayName} icon`))

        const storeIcon = await readFile(
          path.join(extensionRoot, "store-assets", "store-icon-128.png")
        )
        assert.equal(storeIcon.readUInt32BE(16), 128)
        assert.equal(storeIcon.readUInt32BE(20), 128)

        const registry = await readExtensionRegistry(temporaryRoot)
        assert.equal(registry.extensions.length, 1)
        assert.equal(registry.extensions[0].slug, archetype.slug)

        const validationErrors = await validateExtension(
          temporaryRoot,
          registry.extensions[0]
        )
        assert.ok(
          validationErrors.some((error) =>
            error.includes(
              `store-assets/screenshots/${archetype.slug}-1280x800.png`
            )
          )
        )

        await writeFile(
          path.join(extensionRoot, "assets", "icon-source.svg"),
          iconSource.replace("#0f172a", "#172554")
        )
        assert.ok(
          (await validateExtension(temporaryRoot, registry.extensions[0])).some(
            (error) => error.includes("assets/icon.png is stale")
          )
        )

        const localUiPath = path.join(extensionRoot, "src", "components", "ui")
        await mkdir(localUiPath, { recursive: true })
        await writeFile(path.join(localUiPath, "button.tsx"), "export {}\n")
        assert.ok(
          (await validateExtension(temporaryRoot, registry.extensions[0])).some(
            (error) =>
              error.includes("shared UI primitives must live in packages/ui")
          )
        )

        const packagePath = path.join(extensionRoot, "package.json")
        const packageJson = JSON.parse(await readFile(packagePath, "utf8"))
        packageJson.description = "Metadata that drifted from the definition."
        await writeFile(
          packagePath,
          `${JSON.stringify(packageJson, null, 2)}\n`
        )
        assert.ok(
          (await validateExtension(temporaryRoot, registry.extensions[0])).some(
            (error) =>
              error.includes(
                "package description must match extension.config.json"
              )
          )
        )
      } finally {
        await rm(temporaryRoot, { recursive: true, force: true })
      }
    })
  }
})

async function createTemporaryRepo() {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "osbe-extension-"))

  await mkdir(path.join(temporaryRoot, "extensions"), { recursive: true })
  await mkdir(path.join(temporaryRoot, ".github", "workflows"), {
    recursive: true
  })
  await cp(
    path.join(repoRoot, "templates"),
    path.join(temporaryRoot, "templates"),
    { recursive: true }
  )

  return temporaryRoot
}
