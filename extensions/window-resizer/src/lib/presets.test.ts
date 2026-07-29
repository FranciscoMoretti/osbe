import assert from "node:assert/strict"
import test from "node:test"

import {
  createDefaultState,
  DEFAULT_PRESETS,
  movePreset,
  normalizePresetState,
  restoreDefaultPresets
} from "./presets"

test("starts with built-in defaults and returns fresh copies", () => {
  const first = createDefaultState()
  const second = createDefaultState()

  assert.equal(first.presets.length, 6)
  assert.deepEqual(first.presets, DEFAULT_PRESETS)
  assert.notEqual(first.presets, second.presets)
})

test("normalizes saved presets and drops invalid or duplicate entries", () => {
  const state = normalizePresetState({
    version: 99,
    presets: [
      { id: "custom", name: "  QA size  ", width: 1280, height: 800 },
      { id: "custom", name: "Duplicate", width: 1440, height: 900 },
      {
        id: "viewport",
        name: "Viewport",
        width: 1024,
        height: 768,
        target: "viewport"
      },
      { id: "too-small", name: "Invalid", width: 200, height: 800 }
    ]
  })

  assert.deepEqual(state, {
    version: 1,
    presets: [
      {
        id: "custom",
        name: "QA size",
        width: 1280,
        height: 800,
        target: "window"
      },
      {
        id: "viewport",
        name: "Viewport",
        width: 1024,
        height: 768,
        target: "viewport"
      }
    ]
  })
})

test("moves a preset without mutating the existing order", () => {
  const presets = createDefaultState().presets
  const moved = movePreset(presets, "tablet-portrait", -1)

  assert.equal(presets[2].id, "tablet-portrait")
  assert.equal(moved[1].id, "tablet-portrait")
  assert.equal(moved[2].id, "mobile-large")
})

test("restores built-ins without deleting custom presets", () => {
  const restored = restoreDefaultPresets([
    {
      id: "mobile",
      name: "Edited mobile",
      width: 400,
      height: 900,
      target: "viewport"
    },
    {
      id: "qa",
      name: "QA workspace",
      width: 1280,
      height: 800,
      target: "viewport"
    }
  ])

  assert.deepEqual(restored.slice(0, DEFAULT_PRESETS.length), DEFAULT_PRESETS)
  assert.deepEqual(restored.at(-1), {
    id: "qa",
    name: "QA workspace",
    width: 1280,
    height: 800,
    target: "viewport"
  })
})
