#!/usr/bin/env node
import { spawn } from "node:child_process"
import { access, readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { smokeExtensionInChrome } from "./lib/browser-smoke.mjs"
import {
  findExtension,
  generateExtensionIcons,
  readExtensionRegistry,
  validateExtension
} from "./lib/extensions.mjs"
import {
  bumpVersion,
  sha256File,
  updatePackageVersion
} from "./lib/lifecycle.mjs"
import { generateStoreAssets } from "./lib/store-assets.mjs"
import {
  chromeStoreDashboardUrl,
  chromeStoreListingUrl,
  createStorePreflightReport,
  persistStoreId,
  writeStoreSubmission
} from "./lib/store-submission.mjs"

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)
const [command = "list", slug, ...flags] = process.argv.slice(2)
const registry = await readExtensionRegistry(repoRoot)

try {
  if (command === "list") {
    for (const extension of registry.extensions) {
      console.log(
        `${extension.slug}\t${extension.packageName}\t${extension.surface}`
      )
    }
  } else if (command === "validate") {
    const extensions = slug ? [requireExtension(slug)] : registry.extensions
    await validateExtensions(extensions)
    console.log(`Validated ${extensions.length} OSBE extension(s).`)
  } else {
    const extension = requireExtension(slug)

    if (command === "assets" || command === "artwork") {
      await generateExtensionIcons(repoRoot, extension)
      await generateStoreAssets(repoRoot, extension)
      await writeStoreSubmission(repoRoot, extension)
      console.log(`Generated store assets for ${extension.slug}.`)
    } else if (command === "store-dossier") {
      const destination = await writeStoreSubmission(repoRoot, extension)
      console.log(`Generated ${destination}.`)
    } else if (command === "store-preflight") {
      await printStorePreflight(extension, flags)
    } else if (command === "store-id") {
      const storeId = flags[0]
      if (!storeId) {
        throw new Error(
          `Usage: pnpm extension store-id ${extension.slug} <32-character-store-id>`
        )
      }
      await persistStoreId(repoRoot, extension, storeId)
      console.log(`Saved Chrome Web Store ID ${storeId} for ${extension.slug}.`)
    } else if (command === "check") {
      await checkExtension(extension)
    } else if (command === "smoke") {
      await runPackageCommand(extension, "build")
      const result = await smokeExtensionInChrome(repoRoot, extension)
      console.log(
        `Chrome loaded ${result.pageUrl} (${result.title || "untitled"}).`
      )
    } else if (command === "release") {
      await releaseExtension(extension, flags)
    } else if (command === "status") {
      await printStatus(extension)
    } else if (command === "publish") {
      await validateExtensions([extension])
      if (!extension.store.storeId) {
        throw new Error(
          `${extension.slug} needs its first manual submission. After Chrome assigns an ID, run: pnpm extension store-id ${extension.slug} <store-id>`
        )
      }
      await runCommand("gh", [
        "workflow",
        "run",
        extension.release.workflow,
        "--ref",
        "main"
      ])
      console.log(`Triggered ${extension.release.workflow}.`)
      console.log(`Dashboard: ${chromeStoreDashboardUrl(extension)}`)
      console.log(
        extension.store.automaticPublish
          ? "Follow-up: verify the item reaches Published status; approval will publish it automatically."
          : "Follow-up: publish the staged item within 30 days after approval."
      )
    } else if (
      ["dev", "build", "package", "test", "typecheck"].includes(command)
    ) {
      await runPackageCommand(extension, command)
    } else {
      throw new Error(
        "Usage: pnpm extension <list|validate|assets|store-dossier|store-preflight|store-id|dev|build|package|test|typecheck|check|smoke|release|status|publish> [slug]"
      )
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
}

function requireExtension(extensionSlug) {
  const extension = findExtension(registry, extensionSlug)
  if (!extension) {
    throw new Error(`Unknown extension: ${extensionSlug ?? "(missing slug)"}`)
  }
  return extension
}

async function validateExtensions(extensions) {
  const errors = (
    await Promise.all(
      extensions.map((extension) => validateExtension(repoRoot, extension))
    )
  ).flat()

  if (errors.length > 0) {
    throw new Error(errors.map((error) => `- ${error}`).join("\n"))
  }
}

async function checkExtension(extension) {
  await validateExtensions([extension])
  await runPackageCommand(extension, "test")
  await runPackageCommand(extension, "typecheck")
  await runPackageCommand(extension, "build")
  console.log(`Checked ${extension.slug}.`)
}

async function releaseExtension(extension, flags) {
  const releaseTypes = ["patch", "minor", "major"].filter((releaseType) =>
    flags.includes(`--${releaseType}`)
  )
  if (releaseTypes.length !== 1) {
    throw new Error(
      "Release requires exactly one of --patch, --minor, or --major."
    )
  }

  const packagePath = path.join(
    repoRoot,
    "extensions",
    extension.slug,
    "package.json"
  )
  const packageJson = JSON.parse(await readFile(packagePath, "utf8"))
  const nextVersion = bumpVersion(packageJson.version, releaseTypes[0])

  if (flags.includes("--dry-run")) {
    console.log(
      `${extension.displayName}: ${packageJson.version} -> ${nextVersion}`
    )
    return
  }

  await generateExtensionIcons(repoRoot, extension)
  await generateStoreAssets(repoRoot, extension)
  await writeStoreSubmission(repoRoot, extension)
  await validateExtensions([extension])
  await runPackageCommand(extension, "test")
  await runPackageCommand(extension, "typecheck")

  const update = await updatePackageVersion(packagePath, releaseTypes[0])
  try {
    await runPackageCommand(extension, "build")
    await runPackageCommand(extension, "package")
  } catch (error) {
    await update.restore()
    throw error
  }

  const zipPath = packageZipPath(extension)
  const checksum = await sha256File(zipPath)
  console.log(
    `Prepared ${extension.displayName} ${update.nextVersion}: ${zipPath}`
  )
  console.log(`SHA-256 ${checksum}`)
  console.log(
    `After committing and merging the version bump, run: pnpm extension publish ${extension.slug}`
  )
  console.log(
    `Before submission, run: pnpm extension store-preflight ${extension.slug}`
  )
}

async function printStatus(extension) {
  const packagePath = path.join(
    repoRoot,
    "extensions",
    extension.slug,
    "package.json"
  )
  const packageJson = JSON.parse(await readFile(packagePath, "utf8"))
  const zipPath = packageZipPath(extension)
  let artifact = "not packaged"

  try {
    await access(zipPath)
    artifact = `${zipPath} (${await sha256File(zipPath)})`
  } catch {
    // A missing artifact is a useful status, not an error.
  }

  console.log(`${extension.displayName} ${packageJson.version}`)
  console.log(`Surface: ${extension.surface}`)
  console.log(`Workflow: ${extension.release.workflow}`)
  console.log(`Artifact: ${artifact}`)
  if (extension.store.storeId) {
    console.log(`Chrome Web Store ID: ${extension.store.storeId}`)
    console.log(`Listing: ${chromeStoreListingUrl(extension.store.storeId)}`)
    console.log(`Dashboard: ${chromeStoreDashboardUrl(extension)}`)
  } else {
    console.log("Chrome Web Store ID: not assigned (first submission)")
    console.log(`Dashboard: ${chromeStoreDashboardUrl(extension)}`)
  }
}

async function printStorePreflight(extension, flags) {
  const validationErrors = await validateExtension(repoRoot, extension)
  const result = await createStorePreflightReport(repoRoot, extension, {
    online: !flags.includes("--offline"),
    validationErrors
  })

  console.log(result.report)
  if (result.errors.length > 0) {
    throw new Error(
      `Store preflight failed:\n${result.errors
        .map((error) => `- ${error}`)
        .join("\n")}`
    )
  }
}

function packageZipPath(extension) {
  return path.join(
    repoRoot,
    "extensions",
    extension.slug,
    "build",
    "chrome-mv3-prod.zip"
  )
}

function runPackageCommand(extension, packageCommand) {
  return runCommand("pnpm", [
    "--filter",
    extension.packageName,
    "--if-present",
    packageCommand
  ])
}

function runCommand(executable, argumentsList) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, argumentsList, {
      cwd: repoRoot,
      stdio: "inherit"
    })

    child.once("error", reject)
    child.once("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${executable} stopped with signal ${signal}`))
      } else if (code === 0) {
        resolve()
      } else {
        reject(new Error(`${executable} exited with code ${code ?? 1}`))
      }
    })
  })
}
