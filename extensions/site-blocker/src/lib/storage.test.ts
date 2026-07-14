import assert from "node:assert/strict"
import test from "node:test"

import { subscribeToStateChanges } from "./storage"

test("does not crash when a blocked tab's extension context is invalidated", () => {
  const originalChrome = globalThis.chrome

  Object.defineProperty(globalThis, "chrome", {
    configurable: true,
    value: {
      storage: {
        local: {},
        onChanged: {
          addListener() {
            throw new Error("Extension context invalidated.")
          },
          removeListener() {}
        }
      }
    }
  })

  try {
    let unsubscribe = () => {}

    assert.doesNotThrow(() => {
      unsubscribe = subscribeToStateChanges(() => {})
    })
    assert.doesNotThrow(unsubscribe)
  } finally {
    Object.defineProperty(globalThis, "chrome", {
      configurable: true,
      value: originalChrome
    })
  }
})
