import { access, readdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import Ajv2020 from "ajv/dist/2020.js"
import sharp from "sharp"

import {
  getPrivacyPolicyError,
  renderStoreSubmission
} from "./store-submission.mjs"
import { SURFACE_REQUIRED_FILES } from "./surfaces.mjs"

const extensionSchema = JSON.parse(
  await readFile(
    new URL("../../schemas/extension.schema.json", import.meta.url),
    "utf8"
  )
)
const validateExtensionSchema = new Ajv2020({
  allErrors: true
}).compile(extensionSchema)

const REQUIRED_FILES = [
  "README.md",
  "PRIVACY.md",
  "assets/icon-source.svg",
  "assets/icon.png",
  "components.json",
  "extension.config.json",
  "postcss.config.js",
  "store-assets/README.md",
  "store-assets/chrome-web-store-listing.md",
  "store-assets/store-icon-128.png",
  "submit-keys.example.json",
  "tailwind.config.js",
  "tsconfig.json"
]

async function exists(file) {
  try {
    await access(file)
    return true
  } catch {
    return false
  }
}

async function readImageMetadata(file) {
  try {
    return await sharp(file).metadata()
  } catch {
    return undefined
  }
}

export async function readExtensionRegistry(repoRoot) {
  const extensionsRoot = path.join(repoRoot, "extensions")
  const entries = await readdir(extensionsRoot, { withFileTypes: true })
  const extensions = (
    await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          const configPath = path.join(
            extensionsRoot,
            entry.name,
            "extension.config.json"
          )

          if (!(await exists(configPath))) return undefined

          const config = JSON.parse(await readFile(configPath, "utf8"))
          return config
        })
    )
  )
    .filter(Boolean)
    .sort((left, right) => left.slug.localeCompare(right.slug))

  return { extensions }
}

export function findExtension(registry, slug) {
  return registry.extensions.find((extension) => extension.slug === slug)
}

export async function generateExtensionIcons(repoRoot, extension) {
  const extensionRoot = path.join(repoRoot, "extensions", extension.slug)
  const source = path.join(extensionRoot, "assets", "icon-source.svg")
  const { runtimeIcon, storeIcon } = await renderExtensionIcons(source)

  await Promise.all([
    writeFile(path.join(extensionRoot, "assets", "icon.png"), runtimeIcon),
    writeFile(
      path.join(extensionRoot, "store-assets", "store-icon-128.png"),
      storeIcon
    )
  ])
}

export async function validateExtension(repoRoot, extension) {
  const errors = []
  const schemaErrors = getExtensionSchemaErrors(extension)
  const slug =
    typeof extension?.slug === "string" ? extension.slug : "(invalid extension)"

  if (schemaErrors.length > 0) {
    return schemaErrors.map((error) => `${slug}: ${error}`)
  }

  const extensionRoot = path.join(repoRoot, "extensions", extension.slug)
  const packagePath = path.join(extensionRoot, "package.json")
  const definitionErrors = getExtensionSemanticErrors(extension)

  errors.push(...definitionErrors.map((error) => `${extension.slug}: ${error}`))

  if (!(await exists(packagePath))) {
    return [`${extension.slug}: missing package.json`]
  }

  const packageJson = JSON.parse(await readFile(packagePath, "utf8"))

  if (packageJson.name !== extension.packageName) {
    errors.push(
      `${extension.slug}: package name must be ${extension.packageName}`
    )
  }

  if (!packageJson.displayName?.startsWith("OSBE ")) {
    errors.push(`${extension.slug}: displayName must start with "OSBE "`)
  }

  if (packageJson.displayName !== extension.displayName) {
    errors.push(
      `${extension.slug}: package displayName must match extension.config.json`
    )
  }

  if (packageJson.description !== extension.summary) {
    errors.push(
      `${extension.slug}: package description must match extension.config.json`
    )
  }

  const summaryLength = extension.summary?.length ?? 0
  if (summaryLength === 0 || summaryLength > 132) {
    errors.push(
      `${extension.slug}: description must contain 1-132 characters (found ${summaryLength})`
    )
  }

  for (const script of ["dev", "build", "package", "typecheck"]) {
    if (!packageJson.scripts?.[script]) {
      errors.push(`${extension.slug}: missing ${script} package script`)
    }
  }

  for (const workspacePackage of [
    "@osbe/config",
    "@osbe/extension-kit",
    "@osbe/ui"
  ]) {
    if (packageJson.dependencies?.[workspacePackage] !== "workspace:*") {
      errors.push(
        `${extension.slug}: ${workspacePackage} must be a workspace dependency`
      )
    }
  }

  if (!Array.isArray(packageJson.manifest?.permissions)) {
    errors.push(`${extension.slug}: manifest.permissions must be explicit`)
  } else if (
    !sameValues(
      packageJson.manifest.permissions,
      extension.permissions.map((permission) => permission.name)
    )
  ) {
    errors.push(
      `${extension.slug}: manifest.permissions must match extension.config.json`
    )
  }

  const manifestHostPermissions = packageJson.manifest?.host_permissions ?? []
  if (
    !sameValues(
      manifestHostPermissions,
      extension.hostPermissions.map((permission) => permission.name)
    )
  ) {
    errors.push(
      `${extension.slug}: manifest.host_permissions must match extension.config.json`
    )
  }

  for (const relativePath of REQUIRED_FILES) {
    if (!(await exists(path.join(extensionRoot, relativePath)))) {
      errors.push(`${extension.slug}: missing ${relativePath}`)
    }
  }

  const listingPath = path.join(
    extensionRoot,
    "store-assets",
    "chrome-web-store-listing.md"
  )
  if (await exists(listingPath)) {
    const listing = await readFile(listingPath, "utf8")
    if (listing !== renderStoreSubmission(extension)) {
      errors.push(
        `${extension.slug}: store submission dossier is stale; run pnpm extension store-dossier ${extension.slug}`
      )
    }
  }

  for (const relativePath of SURFACE_REQUIRED_FILES[extension.surface] ?? []) {
    if (!(await exists(path.join(extensionRoot, relativePath)))) {
      errors.push(
        `${extension.slug}: ${extension.surface} surface requires ${relativePath}`
      )
    }
  }

  const componentsPath = path.join(extensionRoot, "components.json")
  if (await exists(componentsPath)) {
    const components = JSON.parse(await readFile(componentsPath, "utf8"))
    const tsconfig = JSON.parse(
      await readFile(path.join(extensionRoot, "tsconfig.json"), "utf8")
    )
    if (components.aliases?.ui !== "@osbe/ui/components") {
      errors.push(
        `${extension.slug}: shadcn UI must target @osbe/ui/components`
      )
    }
    if (components.aliases?.utils !== "@osbe/ui/lib/utils") {
      errors.push(
        `${extension.slug}: shadcn utils must target @osbe/ui/lib/utils`
      )
    }
    if (
      tsconfig.compilerOptions?.paths?.["@osbe/ui/*"]?.[0] !==
      "../../packages/ui/src/*"
    ) {
      errors.push(
        `${extension.slug}: tsconfig must resolve @osbe/ui/* to the shared UI source`
      )
    }
  }

  const localUiPath = path.join(extensionRoot, "src", "components", "ui")
  if (await exists(localUiPath)) {
    const localPrimitives = (await readdir(localUiPath)).filter((file) =>
      file.endsWith(".tsx")
    )
    if (localPrimitives.length > 0) {
      errors.push(
        `${extension.slug}: shared UI primitives must live in packages/ui (${localPrimitives.join(
          ", "
        )})`
      )
    }
  }

  const storeIconPath = path.join(
    extensionRoot,
    "store-assets",
    "store-icon-128.png"
  )
  if (await exists(storeIconPath)) {
    const metadata = await readImageMetadata(storeIconPath)
    if (
      metadata?.format !== "png" ||
      metadata.width !== 128 ||
      metadata.height !== 128
    ) {
      errors.push(`${extension.slug}: store icon must be a 128x128 PNG`)
    }
  }

  const iconSourcePath = path.join(extensionRoot, "assets", "icon-source.svg")
  const runtimeIconPath = path.join(extensionRoot, "assets", "icon.png")
  if (
    (await exists(iconSourcePath)) &&
    (await exists(runtimeIconPath)) &&
    (await exists(storeIconPath))
  ) {
    const expected = await renderExtensionIcons(iconSourcePath)
    const [runtimeIcon, storeIcon] = await Promise.all([
      readFile(runtimeIconPath),
      readFile(storeIconPath)
    ])

    if (!runtimeIcon.equals(expected.runtimeIcon)) {
      errors.push(
        `${extension.slug}: assets/icon.png is stale; run pnpm extension assets ${extension.slug}`
      )
    }
    if (!storeIcon.equals(expected.storeIcon)) {
      errors.push(
        `${extension.slug}: store-assets/store-icon-128.png is stale; run pnpm extension assets ${extension.slug}`
      )
    }
  }

  for (const screenshot of extension.store?.screenshots ?? []) {
    const screenshotPath = path.join(extensionRoot, screenshot.file)
    if (!(await exists(screenshotPath))) {
      errors.push(`${extension.slug}: missing ${screenshot.file}`)
      continue
    }

    const metadata = await readImageMetadata(screenshotPath)
    const allowed =
      (metadata?.width === 1280 && metadata?.height === 800) ||
      (metadata?.width === 640 && metadata?.height === 400)

    if (metadata?.format !== "png" || !allowed) {
      errors.push(
        `${extension.slug}: ${screenshot.file} must be 1280x800 or 640x400`
      )
    }
    if (metadata?.hasAlpha) {
      errors.push(
        `${extension.slug}: ${screenshot.file} must not contain an alpha channel`
      )
    }
  }

  for (const promoTile of extension.store?.promoTiles ?? []) {
    const promoPath = path.join(extensionRoot, promoTile.file)
    if (!(await exists(promoPath))) {
      errors.push(`${extension.slug}: missing ${promoTile.file}`)
      continue
    }

    const expectedDimensions = {
      marquee: { height: 560, width: 1400 },
      small: { height: 280, width: 440 }
    }[promoTile.kind]
    const metadata = await readImageMetadata(promoPath)

    if (!expectedDimensions) {
      errors.push(
        `${extension.slug}: ${promoTile.file} must declare promo kind small or marquee`
      )
    } else if (
      metadata?.format !== "png" ||
      metadata.width !== expectedDimensions.width ||
      metadata.height !== expectedDimensions.height
    ) {
      errors.push(
        `${extension.slug}: ${promoTile.file} must be ${expectedDimensions.width}x${expectedDimensions.height}`
      )
    }
    if (metadata?.hasAlpha) {
      errors.push(
        `${extension.slug}: ${promoTile.file} must not contain an alpha channel`
      )
    }
  }

  const workflowPath = path.join(
    repoRoot,
    ".github",
    "workflows",
    extension.release.workflow
  )
  if (!(await exists(workflowPath))) {
    errors.push(
      `${extension.slug}: missing workflow ${extension.release.workflow}`
    )
  } else {
    const workflow = await readFile(workflowPath, "utf8")
    if (!workflow.includes("./.github/workflows/_submit-extension.yml")) {
      errors.push(`${extension.slug}: submission workflow is not reusable`)
    }
    if (!workflow.includes(`extension: ${extension.slug}`)) {
      errors.push(
        `${extension.slug}: submission workflow targets another extension`
      )
    }
    if (!workflow.includes(`secrets.${extension.release.secretName}`)) {
      errors.push(
        `${extension.slug}: submission workflow must use ${extension.release.secretName}`
      )
    }
  }

  return errors
}

export function validateExtensionDefinition(extension) {
  const schemaErrors = getExtensionSchemaErrors(extension)
  if (schemaErrors.length > 0) return schemaErrors

  return getExtensionSemanticErrors(extension)
}

function getExtensionSchemaErrors(extension) {
  if (validateExtensionSchema(extension)) return []

  return (validateExtensionSchema.errors ?? []).map((error) => {
    const location = error.instancePath || "definition"
    return `${location} ${error.message ?? "is invalid"}`
  })
}

function getExtensionSemanticErrors(extension) {
  const errors = []

  if (extension.packageName !== `@osbe/${extension.slug}`) {
    errors.push(`packageName must be @osbe/${extension.slug}`)
  }
  if (
    !extension.singlePurpose?.trim() ||
    extension.singlePurpose.startsWith("TODO:")
  ) {
    errors.push("singlePurpose is required")
  }
  if (
    !extension.store.description.trim() ||
    extension.store.description.startsWith("TODO:")
  ) {
    errors.push("store.description is required")
  }
  if (
    !extension.store.review.instructions.trim() ||
    extension.store.review.instructions.startsWith("TODO:")
  ) {
    errors.push("store.review.instructions is required")
  }
  const privacyPolicyError = getPrivacyPolicyError(extension)
  if (privacyPolicyError) errors.push(privacyPolicyError)
  for (const field of ["homepageUrl", "supportUrl", "privacyPolicyUrl"]) {
    if (!isAbsoluteHttpsUrl(extension.store[field])) {
      errors.push(`store.${field} must be a complete absolute HTTPS URL`)
    }
  }
  if (
    !extension.remoteCode.justification.trim() ||
    extension.remoteCode.justification.startsWith("TODO:")
  ) {
    errors.push("remoteCode.justification is required")
  }
  for (const field of ["permissions", "hostPermissions"]) {
    for (const permission of extension[field]) {
      if (
        !permission?.name ||
        !permission?.justification?.trim() ||
        permission.justification.startsWith("TODO:")
      ) {
        errors.push(`${field} entries require name and justification`)
      }
    }
  }

  return errors
}

function sameValues(left, right) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  )
}

function isAbsoluteHttpsUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === "https:" && Boolean(url.hostname)
  } catch {
    return false
  }
}

async function renderExtensionIcons(source) {
  const sourceContents = await readFile(source)
  const [runtimeIcon, storeIcon] = await Promise.all([
    sharp(sourceContents).png().toBuffer(),
    sharp(sourceContents).resize(128, 128).png().toBuffer()
  ])

  return { runtimeIcon, storeIcon }
}
