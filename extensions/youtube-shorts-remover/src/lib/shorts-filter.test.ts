import assert from "node:assert/strict"
import test from "node:test"

import {
  getShortsRedirect,
  isShortsFilterLabel,
  SHORTS_CONTAINER_SELECTORS,
  SHORTS_FILTER_CSS
} from "./shorts-filter"

test("redirects direct Shorts viewers to YouTube home", () => {
  assert.equal(
    getShortsRedirect("https://www.youtube.com/shorts/abc123?feature=share"),
    "https://www.youtube.com/"
  )
  assert.equal(
    getShortsRedirect("https://www.youtube.com/shorts/"),
    "https://www.youtube.com/"
  )
})

test("redirects channel Shorts tabs to the channel root", () => {
  assert.equal(
    getShortsRedirect("https://www.youtube.com/@ChromeDevs/shorts"),
    "https://www.youtube.com/@ChromeDevs"
  )
  assert.equal(
    getShortsRedirect("https://www.youtube.com/channel/abc123/shorts/"),
    "https://www.youtube.com/channel/abc123"
  )
})

test("leaves normal YouTube and non-YouTube routes unchanged", () => {
  assert.equal(
    getShortsRedirect("https://www.youtube.com/watch?v=abc123"),
    undefined
  )
  assert.equal(
    getShortsRedirect("https://example.com/shorts/abc123"),
    undefined
  )
})

test("covers navigation, shelves, cards, recommendations, and channel tabs", () => {
  const expectedFragments = [
    "ytd-reel-shelf-renderer",
    "grid-shelf-view-model",
    "ytd-rich-item-renderer",
    "ytd-video-renderer",
    "ytd-compact-video-renderer",
    "ytd-mini-guide-entry-renderer",
    "yt-tab-shape"
  ]

  for (const fragment of expectedFragments) {
    assert.ok(
      SHORTS_CONTAINER_SELECTORS.some((selector) => selector.includes(fragment))
    )
    assert.ok(SHORTS_FILTER_CSS.includes(fragment))
  }
})

test("does not rely on filter-chip order", () => {
  assert.ok(!SHORTS_FILTER_CSS.includes("Shorts"))
  assert.ok(!SHORTS_FILTER_CSS.includes("nth-of-type"))
})

test("recognizes YouTube's Shorts search filter label", () => {
  assert.equal(isShortsFilterLabel("Shorts"), true)
  assert.equal(isShortsFilterLabel("  SHORTS  "), true)
  assert.equal(isShortsFilterLabel("Videos"), false)
  assert.equal(isShortsFilterLabel(undefined), false)
})
