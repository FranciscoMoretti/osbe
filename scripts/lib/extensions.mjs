import { access, readdir, readFile } from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"

const REQUIRED_FILES = [
  "README.md",
  "PRIVACY.md",
  "assets/icon-source.svg",
  "assets/icon.png",
  "components.json",
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

async function readPngDimensions(file) {
  const png = await readFile(file)
  const hasPngHeader =
    png.length >= 24 && png.subarray(1, 4).toString("ascii") === "PNG"

  if (!hasPngHeader) {
    return undefined
  }

  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20)
  }
}

export async function readCatalog(repoRoot) {
  const catalogPath = path.join(repoRoot, "extensions", "catalog.json")
  const catalog = JSON.parse(await readFile(catalogPath, "utf8"))

  if (!Array.isArray(catalog.extensions)) {
    throw new Error("extensions/catalog.json must contain an extensions array")
  }

  return catalog
}

export function findExtension(catalog, slug) {
  return catalog.extensions.find((extension) => extension.slug === slug)
}

export async function generateExtensionIcons(repoRoot, extension) {
  const extensionRoot = path.join(repoRoot, "extensions", extension.slug)
  const source = path.join(extensionRoot, "assets", "icon-source.svg")

  await Promise.all([
    sharp(source)
      .png()
      .toFile(path.join(extensionRoot, "assets", "icon.png")),
    sharp(source)
      .resize(128, 128)
      .png()
      .toFile(path.join(extensionRoot, "store-assets", "store-icon-128.png"))
  ])
}

export async function validateExtension(repoRoot, extension) {
  const errors = []
  const extensionRoot = path.join(repoRoot, "extensions", extension.slug)
  const packagePath = path.join(extensionRoot, "package.json")

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

  const summaryLength = packageJson.description?.length ?? 0
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

  for (const workspacePackage of ["@osbe/config", "@osbe/ui"]) {
    if (packageJson.dependencies?.[workspacePackage] !== "workspace:*") {
      errors.push(
        `${extension.slug}: ${workspacePackage} must be a workspace dependency`
      )
    }
  }

  if (!Array.isArray(packageJson.manifest?.permissions)) {
    errors.push(`${extension.slug}: manifest.permissions must be explicit`)
  }

  for (const relativePath of REQUIRED_FILES) {
    if (!(await exists(path.join(extensionRoot, relativePath)))) {
      errors.push(`${extension.slug}: missing ${relativePath}`)
    }
  }

  const componentsPath = path.join(extensionRoot, "components.json")
  if (await exists(componentsPath)) {
    const components = JSON.parse(await readFile(componentsPath, "utf8"))
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
    const dimensions = await readPngDimensions(storeIconPath)
    if (dimensions?.width !== 128 || dimensions?.height !== 128) {
      errors.push(`${extension.slug}: store icon must be a 128x128 PNG`)
    }
  }

  const screenshotsPath = path.join(
    extensionRoot,
    "store-assets",
    "screenshots"
  )
  if (await exists(screenshotsPath)) {
    const screenshots = await readdir(screenshotsPath)
    if (!screenshots.some((file) => file.endsWith(".png"))) {
      errors.push(
        `${extension.slug}: store-assets/screenshots has no PNG files`
      )
    }
  } else {
    errors.push(`${extension.slug}: missing store-assets/screenshots`)
  }

  const workflowPath = path.join(
    repoRoot,
    ".github",
    "workflows",
    extension.workflow
  )
  if (!(await exists(workflowPath))) {
    errors.push(`${extension.slug}: missing workflow ${extension.workflow}`)
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
    if (!workflow.includes(`secrets.${extension.secretName}`)) {
      errors.push(
        `${extension.slug}: submission workflow must use ${extension.secretName}`
      )
    }
  }

  return errors
}
