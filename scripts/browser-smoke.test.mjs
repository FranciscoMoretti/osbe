import assert from "node:assert/strict"
import test from "node:test"

import { extensionIdFromPublicKey } from "./lib/browser-smoke.mjs"

test("derives a Chrome-compatible extension id from a public key", () => {
  const extensionId = extensionIdFromPublicKey(
    Buffer.from("osbe-test-public-key")
  )

  assert.match(extensionId, /^[a-p]{32}$/)
  assert.equal(
    extensionId,
    extensionIdFromPublicKey(Buffer.from("osbe-test-public-key"))
  )
})
