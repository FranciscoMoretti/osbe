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

test("keeps the schema category vocabulary aligned with the current store", async () => {
  const schema = JSON.parse(
    await readFile(
      path.join(repoRoot, "schemas", "extension.schema.json"),
      "utf8"
    )
  )

  const categories = schema.properties.store.properties.category.enum
  assert.ok(categories.includes("Functionality & UI"))
  assert.ok(categories.includes("Privacy & Security"))
  assert.ok(categories.includes("Social Media & Networking"))
  assert.ok(!categories.includes("Productivity"))
})

test("rejects incomplete or non-HTTPS store URLs", async () => {
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

  definition.store.homepageUrl = "https://"
  const incompleteErrors = validateExtensionDefinition(definition)

  assert.ok(
    incompleteErrors.includes(
      "store.homepageUrl must be a complete absolute HTTPS URL"
    )
  )

  definition.store.homepageUrl = "https://example.com"
  definition.store.supportUrl = "http://example.com"
  const nonHttpsErrors = validateExtensionDefinition(definition)

  assert.ok(nonHttpsErrors.some((error) => error.includes("/store/supportUrl")))
})
