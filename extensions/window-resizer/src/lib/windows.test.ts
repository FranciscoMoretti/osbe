import assert from "node:assert/strict"
import test from "node:test"

import {
  readCurrentWindowSize,
  resizeCurrentWindow,
  type WindowAdapter
} from "./windows"

test("reads the outer dimensions of the current browser window", async () => {
  const adapter: WindowAdapter = {
    async getCurrent() {
      return { id: 42, width: 1280, height: 800, state: "normal" }
    },
    async update() {
      throw new Error("not called")
    }
  }

  assert.deepEqual(await readCurrentWindowSize(adapter), {
    width: 1280,
    height: 800
  })
})

test("restores a window to normal state while applying preset bounds", async () => {
  const updates: unknown[] = []
  const adapter: WindowAdapter = {
    async getCurrent() {
      return { id: 42, width: 1920, height: 1080, state: "maximized" }
    },
    async update(windowId, update) {
      updates.push({ windowId, update })
      return { id: windowId, ...update }
    }
  }

  const size = await resizeCurrentWindow(
    { width: 1440, height: 900 },
    adapter
  )

  assert.deepEqual(updates, [
    {
      windowId: 42,
      update: { state: "normal", width: 1440, height: 900 }
    }
  ])
  assert.deepEqual(size, { width: 1440, height: 900 })
})
