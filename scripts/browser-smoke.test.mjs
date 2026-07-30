import assert from "node:assert/strict"
import test from "node:test"

import {
  extensionIdFromPublicKey,
  getSmokePageUrl
} from "./lib/browser-smoke.mjs"

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

test("opens extension pages and external content-only smoke pages", () => {
  assert.equal(
    getSmokePageUrl("popup.html", "abcdefghijklmnopabcdefghijklmnop"),
    "chrome-extension://abcdefghijklmnopabcdefghijklmnop/popup.html"
  )
  assert.equal(
    getSmokePageUrl(
      "https://www.youtube.com/results?search_query=javascript",
      "abcdefghijklmnopabcdefghijklmnop"
    ),
    "https://www.youtube.com/results?search_query=javascript"
  )
})
