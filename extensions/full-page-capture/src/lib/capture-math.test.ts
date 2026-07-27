import assert from "node:assert/strict"
import test from "node:test"

import {
  canCreateSingleCanvas,
  createDownloadBaseName,
  createPdfSlices,
  getNextScrollY
} from "./capture-math"

test("covers a page with a final overlapping viewport at the document end", () => {
  const positions = [0]

  while (true) {
    const next = getNextScrollY({
      currentY: positions.at(-1) ?? 0,
      documentHeight: 2500,
      viewportHeight: 1000
    })

    if (next === null) break
    positions.push(next)
  }

  assert.deepEqual(positions, [0, 1000, 1500])
})

test("stops immediately when the document fits in one viewport", () => {
  assert.equal(
    getNextScrollY({
      currentY: 0,
      documentHeight: 800,
      viewportHeight: 1000
    }),
    null
  )
})

test("rejects images beyond browser canvas dimensions or area", () => {
  assert.equal(canCreateSingleCanvas(1440, 12000), true)
  assert.equal(canCreateSingleCanvas(1440, 40000), false)
  assert.equal(canCreateSingleCanvas(20000, 20000), false)
})

test("creates page-sized PDF slices without dropping the final rows", () => {
  assert.deepEqual(createPdfSlices(1200, 3000, 595.28, 841.89), [
    { sourceY: 0, sourceHeight: 1697 },
    { sourceY: 1697, sourceHeight: 1303 }
  ])
})

test("creates a filesystem-safe deterministic download name", () => {
  assert.equal(
    createDownloadBaseName(
      "  A guide: capture / export?  ",
      new Date("2026-07-27T10:11:12Z")
    ),
    "A-guide-capture-export-2026-07-27"
  )
})
