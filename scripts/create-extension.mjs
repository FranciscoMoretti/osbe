#!/usr/bin/env node
import { copyFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

import { readCatalog } from "./lib/extensions.mjs"

const repoRoot = process.env.OSBE_REPO_ROOT
  ? path.resolve(process.env.OSBE_REPO_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const templateRoot = path.join(repoRoot, "templates", "extension")
const workflowTemplate = path.join(
  repoRoot,
  "templates",
  "submit-extension.yml"
)
const iconSource = path.join(repoRoot, "docs", "assets", "osbe-icon-base.png")

const slug = process.argv[2]
const displayName = process.argv.slice(3).join(" ")

if (!slug || !displayName) {
  console.error('Usage: pnpm new:extension <kebab-name> "OSBE Display Name"')
  process.exit(1)
}

if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  console.error("Extension name must be kebab case, for example: link-cleaner")
  process.exit(1)
}

if (!displayName.startsWith("OSBE ")) {
  console.error('Display name must start with "OSBE "')
  process.exit(1)
}

const extensionRoot = path.join(repoRoot, "extensions", slug)
const workflowName = `submit-${slug}.yml`
const workflowPath = path.join(repoRoot, ".github", "workflows", workflowName)
const secretName = `${slug.toUpperCase().replaceAll("-", "_")}_SUBMIT_KEYS`
const values = { slug, displayName, secretName }

function render(content) {
  return Object.entries(values).reduce(
    (rendered, [key, value]) => rendered.replaceAll(`{{${key}}}`, value),
    content
  )
}

async function renderDirectory(source, destination) {
  await mkdir(destination, { recursive: true })

  for (const entry of await readdir(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name)
    const destinationPath = path.join(destination, entry.name)

    if (entry.isDirectory()) {
      await renderDirectory(sourcePath, destinationPath)
      continue
    }

    const content = await readFile(sourcePath, "utf8")
    await writeFile(destinationPath, render(content), { flag: "wx" })
  }
}

const catalog = await readCatalog(repoRoot)
if (catalog.extensions.some((extension) => extension.slug === slug)) {
  console.error(`Extension already exists in catalog: ${slug}`)
  process.exit(1)
}

try {
  await mkdir(extensionRoot, { recursive: false })
} catch (error) {
  if (error?.code === "EEXIST") {
    console.error(`Extension already exists: extensions/${slug}`)
    process.exit(1)
  }
  throw error
}

await renderDirectory(templateRoot, extensionRoot)
await mkdir(path.join(extensionRoot, "assets"), { recursive: true })
await copyFile(iconSource, path.join(extensionRoot, "assets", "icon.png"))
await sharp(iconSource)
  .resize(128, 128)
  .png()
  .toFile(path.join(extensionRoot, "store-assets", "store-icon-128.png"))

const workflow = render(await readFile(workflowTemplate, "utf8"))
await writeFile(workflowPath, workflow, { flag: "wx" })

catalog.extensions.push({
  slug,
  packageName: `@osbe/${slug}`,
  workflow: workflowName,
  secretName
})
catalog.extensions.sort((left, right) => left.slug.localeCompare(right.slug))
await writeFile(
  path.join(repoRoot, "extensions", "catalog.json"),
  `${JSON.stringify(catalog, null, 2)}\n`
)

console.log(`Created extensions/${slug}`)
console.log(`Registered .github/workflows/${workflowName}`)
console.log(`Run: pnpm install`)
console.log(`Then: pnpm extension dev ${slug}`)
