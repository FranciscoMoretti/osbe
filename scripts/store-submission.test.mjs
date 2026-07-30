import assert from "node:assert/strict"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import test from "node:test"

import {
  createStorePreflightReport,
  persistStoreId,
  renderStoreSubmission
} from "./lib/store-submission.mjs"

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)

test("renders a copy-ready store dossier from extension metadata", async () => {
  const extension = JSON.parse(
    await readFile(
      path.join(
        repoRoot,
        "extensions",
        "window-resizer",
        "extension.config.json"
      ),
      "utf8"
    )
  )
  const dossier = renderStoreSubmission(extension)

  assert.match(dossier, /Generated from `extension\.config\.json`/)
  assert.match(dossier, /Functionality & UI/)
  assert.match(dossier, new RegExp(extension.store.storeId))
  assert.match(dossier, new RegExp(extension.permissions[0].justification))
  assert.match(dossier, new RegExp(extension.store.privacyPolicyUrl))
  assert.match(dossier, /Publish automatically after the item passes review/)
})

test("preflight distinguishes a ready existing item from its first submission", async () => {
  const temporaryRoot = await mkdtemp(
    path.join(os.tmpdir(), "osbe-store-preflight-")
  )
  const extension = {
    slug: "fixture",
    displayName: "OSBE Fixture",
    permissions: [],
    hostPermissions: [],
    store: {
      automaticPublish: true,
      privacyPolicyUrl:
        "https://github.com/FranciscoMoretti/osbe/blob/main/extensions/fixture/PRIVACY.md",
      storeId: "abcdefghijklmnopabcdefghijklmnop"
    }
  }
  const extensionRoot = path.join(temporaryRoot, "extensions", extension.slug)

  try {
    await mkdir(path.join(extensionRoot, "build"), { recursive: true })
    await writeFile(
      path.join(extensionRoot, "package.json"),
      `${JSON.stringify({ version: "1.2.3" })}\n`
    )
    await writeFile(
      path.join(extensionRoot, "build", "chrome-mv3-prod.zip"),
      "fixture"
    )

    const ready = await createStorePreflightReport(temporaryRoot, extension, {
      fetchImpl: async () => ({ ok: true, status: 200 }),
      readPackagedManifest: async () => ({
        host_permissions: [],
        permissions: [],
        version: "1.2.3"
      }),
      validationErrors: []
    })
    assert.deepEqual(ready.errors, [])
    assert.match(ready.report, /Existing item update/)
    assert.match(ready.report, /Privacy policy is publicly reachable/)

    delete extension.store.storeId
    const firstSubmission = await createStorePreflightReport(
      temporaryRoot,
      extension,
      {
        online: false,
        readPackagedManifest: async () => ({
          host_permissions: [],
          permissions: [],
          version: "1.2.3"
        }),
        validationErrors: []
      }
    )
    assert.deepEqual(firstSubmission.errors, [])
    assert.match(firstSubmission.report, /First submission/)
    assert.match(firstSubmission.report, /store-id fixture/)

    const stalePackage = await createStorePreflightReport(
      temporaryRoot,
      extension,
      {
        online: false,
        readPackagedManifest: async () => ({
          host_permissions: [],
          permissions: ["tabs"],
          version: "1.2.2"
        }),
        validationErrors: []
      }
    )
    assert.equal(stalePackage.errors.length, 2)
    assert.match(stalePackage.report, /2 readiness problem/)
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true })
  }
})

test("persists the first-submission store ID and refreshes the dossier", async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "osbe-store-id-"))
  const extension = JSON.parse(
    await readFile(
      path.join(
        repoRoot,
        "extensions",
        "window-resizer",
        "extension.config.json"
      ),
      "utf8"
    )
  )
  delete extension.store.storeId
  const extensionRoot = path.join(temporaryRoot, "extensions", extension.slug)
  const storeId = "abcdefghijklmnopabcdefghijklmnop"

  try {
    await mkdir(path.join(extensionRoot, "store-assets"), { recursive: true })
    await writeFile(
      path.join(extensionRoot, "extension.config.json"),
      `${JSON.stringify(extension, null, 2)}\n`
    )

    await persistStoreId(temporaryRoot, extension, storeId)

    const saved = JSON.parse(
      await readFile(path.join(extensionRoot, "extension.config.json"), "utf8")
    )
    const dossier = await readFile(
      path.join(extensionRoot, "store-assets", "chrome-web-store-listing.md"),
      "utf8"
    )
    assert.equal(saved.store.storeId, storeId)
    assert.match(dossier, new RegExp(storeId))
    await persistStoreId(temporaryRoot, extension, storeId)
    await assert.rejects(
      persistStoreId(
        temporaryRoot,
        extension,
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
      ),
      /already has Chrome Web Store ID/
    )
    await assert.rejects(
      persistStoreId(temporaryRoot, extension, "invalid"),
      /exactly 32 characters/
    )
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true })
  }
})

test("preflight treats manifest permission order as insignificant", async () => {
  const temporaryRoot = await mkdtemp(
    path.join(os.tmpdir(), "osbe-store-permissions-")
  )
  const extension = {
    slug: "fixture",
    displayName: "OSBE Fixture",
    permissions: [
      { name: "tabs", justification: "Fixture" },
      { name: "storage", justification: "Fixture" }
    ],
    hostPermissions: [
      { name: "https://example.com/*", justification: "Fixture" },
      { name: "https://example.org/*", justification: "Fixture" }
    ],
    store: {
      automaticPublish: true,
      privacyPolicyUrl:
        "https://github.com/FranciscoMoretti/osbe/blob/main/extensions/fixture/PRIVACY.md"
    }
  }
  const extensionRoot = path.join(temporaryRoot, "extensions", extension.slug)

  try {
    await mkdir(path.join(extensionRoot, "build"), { recursive: true })
    await writeFile(
      path.join(extensionRoot, "package.json"),
      `${JSON.stringify({ version: "1.2.3" })}\n`
    )
    await writeFile(
      path.join(extensionRoot, "build", "chrome-mv3-prod.zip"),
      "fixture"
    )

    const report = await createStorePreflightReport(temporaryRoot, extension, {
      online: false,
      readPackagedManifest: async () => ({
        host_permissions: ["https://example.org/*", "https://example.com/*"],
        permissions: ["storage", "tabs"],
        version: "1.2.3"
      }),
      validationErrors: []
    })

    assert.deepEqual(report.errors, [])
    assert.match(report.report, /Package manifest matches version 1\.2\.3/)
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true })
  }
})
