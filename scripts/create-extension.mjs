#!/usr/bin/env node
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  generateExtensionIcons,
  readExtensionRegistry
} from "./lib/extensions.mjs"
import { writeStoreSubmission } from "./lib/store-submission.mjs"
import { createSurfaceDefinition } from "./lib/surfaces.mjs"

const repoRoot = process.env.OSBE_REPO_ROOT
  ? path.resolve(process.env.OSBE_REPO_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const templateRoot = path.join(repoRoot, "templates", "extension")
const surfaceTemplatesRoot = path.join(
  repoRoot,
  "templates",
  "extension-surfaces"
)
const workflowTemplate = path.join(
  repoRoot,
  "templates",
  "submit-extension.yml"
)
const argumentsList = process.argv.slice(2)
const slug = argumentsList[0]
const surfaceFlagIndex = argumentsList.indexOf("--surface")
const surface =
  surfaceFlagIndex === -1 ? "popup" : argumentsList[surfaceFlagIndex + 1]
const displayName = argumentsList
  .slice(1, surfaceFlagIndex === -1 ? undefined : surfaceFlagIndex)
  .join(" ")
const surfaceDefinition = createSurfaceDefinition(surface, displayName)

if (!slug || !displayName) {
  console.error(
    'Usage: pnpm new:extension <kebab-name> "OSBE Display Name" [--surface popup|action-result|dashboard]'
  )
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

if (!surfaceDefinition) {
  console.error("Surface must be popup, action-result, or dashboard")
  process.exit(1)
}

const extensionRoot = path.join(repoRoot, "extensions", slug)
const workflowName = `submit-${slug}.yml`
const workflowPath = path.join(repoRoot, ".github", "workflows", workflowName)
const secretName = `${slug.toUpperCase().replaceAll("-", "_")}_SUBMIT_KEYS`
const values = {
  slug,
  displayName,
  manifest: JSON.stringify(surfaceDefinition.manifest, null, 2),
  permissions: JSON.stringify(surfaceDefinition.permissions, null, 2),
  secretName,
  smokePage: surfaceDefinition.smokePage,
  surface
}

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

const registry = await readExtensionRegistry(repoRoot)
if (registry.extensions.some((extension) => extension.slug === slug)) {
  console.error(`Extension already exists: ${slug}`)
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
await renderDirectory(path.join(surfaceTemplatesRoot, surface), extensionRoot)
await generateExtensionIcons(repoRoot, { slug })
const extensionDefinition = JSON.parse(
  await readFile(path.join(extensionRoot, "extension.config.json"), "utf8")
)
await writeStoreSubmission(repoRoot, extensionDefinition)

const workflow = render(await readFile(workflowTemplate, "utf8"))
await writeFile(workflowPath, workflow, { flag: "wx" })

console.log(`Created extensions/${slug}`)
console.log(`Surface: ${surface}`)
console.log(`Registered .github/workflows/${workflowName}`)
console.log(`Run: pnpm install`)
console.log(`Then: pnpm extension dev ${slug}`)
