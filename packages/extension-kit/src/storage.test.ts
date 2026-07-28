import assert from "node:assert/strict"
import test from "node:test"

import {
  createBrowserStorageAdapter,
  createMemoryStorageAdapter,
  createStoredState
} from "./storage"

type Settings = {
  enabled: boolean
  count: number
}

const defaults: Settings = {
  enabled: true,
  count: 0
}

function normalizeSettings(value: unknown): Settings {
  const candidate =
    value && typeof value === "object" ? (value as Partial<Settings>) : {}

  return {
    enabled:
      typeof candidate.enabled === "boolean"
        ? candidate.enabled
        : defaults.enabled,
    count:
      typeof candidate.count === "number" ? candidate.count : defaults.count
  }
}

test("normalizes, updates, and publishes stored state", async () => {
  const adapter = createMemoryStorageAdapter({
    settings: { enabled: false, count: "invalid" }
  })
  const store = createStoredState({
    adapter,
    defaults,
    key: "settings",
    normalize: normalizeSettings
  })
  let changes = 0
  const unsubscribe = store.subscribe(() => {
    changes += 1
  })

  assert.deepEqual(await store.read(), { enabled: false, count: 0 })
  assert.deepEqual(
    await store.update((current) => ({
      ...current,
      count: current.count + 1
    })),
    { enabled: false, count: 1 }
  )
  assert.equal(changes, 1)

  unsubscribe()
  await store.write(defaults)
  assert.equal(changes, 1)
})

test("returns defaults when storage is empty", async () => {
  const store = createStoredState({
    adapter: createMemoryStorageAdapter(),
    defaults,
    key: "settings",
    normalize: normalizeSettings
  })

  assert.deepEqual(await store.read(), defaults)
})

test("keeps stale extension pages safe after their context is invalidated", async () => {
  const originalChrome = globalThis.chrome
  const invalidated = new Error("Extension context invalidated.")

  Object.defineProperty(globalThis, "chrome", {
    configurable: true,
    value: {
      storage: {
        local: {
          get: async () => {
            throw invalidated
          },
          set: async () => {
            throw invalidated
          }
        }
      }
    }
  })

  try {
    const adapter = createBrowserStorageAdapter()
    assert.equal(await adapter.get("settings"), undefined)
    await assert.doesNotReject(() => adapter.set("settings", defaults))
  } finally {
    Object.defineProperty(globalThis, "chrome", {
      configurable: true,
      value: originalChrome
    })
  }
})
