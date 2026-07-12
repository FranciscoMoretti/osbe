import assert from "node:assert/strict"
import test from "node:test"

import {
  createDnrUrlFilter,
  createDirectFaviconUrls,
  createFaviconPageUrls,
  ruleDomainMatchesUrl
} from "./matcher"

test("matches an apex domain URL with a path", () => {
  const rule = {
    id: "x",
    domain: "x.com",
    enabled: true,
    createdAt: 1
  }

  assert.equal(ruleDomainMatchesUrl(rule, "https://x.com/home"), true)
  assert.equal(ruleDomainMatchesUrl(rule, "https://mobile.x.com/home"), true)
  assert.equal(ruleDomainMatchesUrl(rule, "https://notx.com/home"), false)
  assert.equal(ruleDomainMatchesUrl(rule, "https://x.com.example/home"), false)
})

test("creates a Chrome domain filter that covers paths and subdomains", () => {
  assert.equal(createDnrUrlFilter("x.com"), "||x.com^")
})

test("tries the www host when an apex-domain favicon is unavailable", () => {
  assert.deepEqual(createFaviconPageUrls("linkedin.com"), [
    "https://linkedin.com/",
    "https://www.linkedin.com/"
  ])
})

test("does not add www twice for an explicit subdomain", () => {
  assert.deepEqual(createFaviconPageUrls("www.linkedin.com"), [
    "https://www.linkedin.com/"
  ])
})

test("falls back to the site's own favicon when Chrome has no cached icon", () => {
  assert.deepEqual(createDirectFaviconUrls("linkedin.com"), [
    "https://linkedin.com/favicon.ico",
    "https://www.linkedin.com/favicon.ico"
  ])
})
