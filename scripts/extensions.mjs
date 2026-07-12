#!/usr/bin/env node
import { spawn } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  findExtension,
  readCatalog,
  validateExtension
} from "./lib/extensions.mjs"

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)
const [command = "list", slug] = process.argv.slice(2)
const catalog = await readCatalog(repoRoot)

if (command === "list") {
  for (const extension of catalog.extensions) {
    console.log(`${extension.slug}\t${extension.packageName}`)
  }
  process.exit(0)
}

if (command === "validate") {
  const extensions = slug
    ? [findExtension(catalog, slug)].filter(Boolean)
    : catalog.extensions

  if (extensions.length === 0) {
    console.error(`Unknown extension: ${slug}`)
    process.exit(1)
  }

  const errors = (
    await Promise.all(
      extensions.map((extension) => validateExtension(repoRoot, extension))
    )
  ).flat()

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`- ${error}`)
    }
    process.exit(1)
  }

  console.log(`Validated ${extensions.length} OSBE extension(s).`)
  process.exit(0)
}

if (!["dev", "build", "package", "publish", "test"].includes(command)) {
  console.error(
    "Usage: pnpm extension <list|validate|dev|build|package|publish|test> [slug]"
  )
  process.exit(1)
}

const extension = findExtension(catalog, slug)
if (!extension) {
  console.error(`Unknown extension: ${slug ?? "(missing slug)"}`)
  process.exit(1)
}

const child =
  command === "publish"
    ? spawn("gh", ["workflow", "run", extension.workflow, "--ref", "main"], {
        cwd: repoRoot,
        stdio: "inherit"
      })
    : spawn(
        "pnpm",
        ["--filter", extension.packageName, "--if-present", command],
        {
          cwd: repoRoot,
          stdio: "inherit"
        }
      )

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
  } else {
    process.exit(code ?? 1)
  }
})
