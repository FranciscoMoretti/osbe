import assert from "node:assert/strict"
import test from "node:test"

import {
  readCurrentWindowMetrics,
  resizeCurrentWindow,
  type WindowAdapter
} from "./windows"

test("reads the outer window and active-tab viewport dimensions", async () => {
  const adapter: WindowAdapter = {
    async getCurrent() {
      return { id: 42, width: 1280, height: 800, state: "normal" }
    },
    async getViewport() {
      return { width: 1240, height: 690 }
    },
    async update() {
      throw new Error("not called")
    }
  }

  assert.deepEqual(await readCurrentWindowMetrics(adapter), {
    window: { width: 1280, height: 800 },
    viewport: { width: 1240, height: 690 }
  })
})

test("applies requested outer window bounds", async () => {
  const updates: unknown[] = []
  let currentWindow: {
    height: number
    id: number
    state: "maximized" | "normal"
    width: number
  } = {
    id: 42,
    width: 1920,
    height: 1080,
    state: "maximized"
  }
  const adapter: WindowAdapter = {
    async getCurrent() {
      return currentWindow
    },
    async getViewport() {
      return {
        width: currentWindow.width - 40,
        height: currentWindow.height - 110
      }
    },
    async update(windowId, update) {
      updates.push({ windowId, update })
      currentWindow = {
        id: windowId,
        width: update.width ?? currentWindow.width,
        height: update.height ?? currentWindow.height,
        state: "normal"
      }
      return currentWindow
    }
  }

  const size = await resizeCurrentWindow(
    { width: 1440, height: 900, target: "window" },
    adapter
  )

  assert.deepEqual(updates, [
    {
      windowId: 42,
      update: { state: "normal", width: 1440, height: 900 }
    }
  ])
  assert.deepEqual(size, {
    window: { width: 1440, height: 900 },
    viewport: { width: 1400, height: 790 }
  })
})

test("adds browser chrome offsets when applying viewport bounds", async () => {
  const updates: unknown[] = []
  let currentWindow = {
    id: 42,
    width: 1440,
    height: 900,
    state: "normal" as const
  }
  const adapter: WindowAdapter = {
    async getCurrent() {
      return currentWindow
    },
    async getViewport() {
      return {
        width: currentWindow.width - 40,
        height: currentWindow.height - 110
      }
    },
    async update(windowId, update) {
      updates.push({ windowId, update })
      currentWindow = {
        id: windowId,
        width: update.width ?? currentWindow.width,
        height: update.height ?? currentWindow.height,
        state: "normal"
      }
      return currentWindow
    }
  }

  const size = await resizeCurrentWindow(
    { width: 1280, height: 720, target: "viewport" },
    adapter
  )

  assert.deepEqual(updates, [
    {
      windowId: 42,
      update: { state: "normal", width: 1320, height: 830 }
    }
  ])
  assert.deepEqual(size, {
    window: { width: 1320, height: 830 },
    viewport: { width: 1280, height: 720 }
  })
})

test("corrects viewport bounds after Chrome changes its frame offset", async () => {
  const updates: Array<{ height?: number; width?: number }> = []
  let viewport = { width: 1400, height: 790 }
  const adapter: WindowAdapter = {
    async getCurrent() {
      return { id: 42, width: 1440, height: 900, state: "maximized" }
    },
    async getViewport() {
      return viewport
    },
    async update(windowId, update) {
      updates.push(update)
      viewport =
        updates.length === 1
          ? { width: 1250, height: 690 }
          : { width: 1280, height: 720 }
      return { id: windowId, ...update }
    }
  }

  const metrics = await resizeCurrentWindow(
    { width: 1280, height: 720, target: "viewport" },
    adapter
  )

  assert.deepEqual(updates, [
    { state: "normal", width: 1320, height: 830 },
    { state: "normal", width: 1350, height: 860 }
  ])
  assert.deepEqual(metrics, {
    window: { width: 1350, height: 860 },
    viewport: { width: 1280, height: 720 }
  })
})

test("window targets still work when the active page cannot be measured", async () => {
  const adapter: WindowAdapter = {
    async getCurrent() {
      return { id: 42, width: 1440, height: 900, state: "normal" }
    },
    async getViewport() {
      throw new Error("restricted page")
    },
    async update(windowId, update) {
      return { id: windowId, ...update }
    }
  }

  assert.deepEqual(
    await resizeCurrentWindow(
      { width: 1280, height: 800, target: "window" },
      adapter
    ),
    {
      window: { width: 1280, height: 800 },
      viewport: null
    }
  )
})
