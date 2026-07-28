import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import test from "node:test"

import { validateExtensionDefinition } from "./lib/extensions.mjs"

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)

test("executes the extension schema when validating metadata", async () => {
  const definition = JSON.parse(
    await readFile(
      path.join(
        repoRoot,
        "extensions",
        "full-page-capture",
        "extension.config.json"
      ),
      "utf8"
    )
  )

  assert.deepEqual(validateExtensionDefinition(definition), [])

  definition.store.category = "Made up"
  definition.store.untrackedField = true
  const errors = validateExtensionDefinition(definition)

  assert.ok(errors.some((error) => error.includes("/store/category")))
  assert.ok(errors.some((error) => error.includes("additional properties")))
})
