import assert from "node:assert/strict"
import test from "node:test"

import {
  positionPageForCapture,
  preparePageForCapture,
  restorePageAfterCapture
} from "./page-capture"

class FakeStyle {
  private readonly priorities = new Map<string, string>()
  private readonly values = new Map<string, string>()

  getPropertyPriority(property: string) {
    return this.priorities.get(property) ?? ""
  }

  getPropertyValue(property: string) {
    return this.values.get(property) ?? ""
  }

  removeProperty(property: string) {
    const value = this.getPropertyValue(property)
    this.priorities.delete(property)
    this.values.delete(property)
    return value
  }

  setProperty(property: string, value: string, priority = "") {
    this.values.set(property, value)
    this.priorities.set(property, priority)
  }
}

test("hides sticky page chrome after starting a capture mid-page", async () => {
  const originalGlobals = new Map<string, PropertyDescriptor | undefined>()
  const setGlobal = (name: string, value: unknown) => {
    originalGlobals.set(name, Object.getOwnPropertyDescriptor(globalThis, name))
    Object.defineProperty(globalThis, name, {
      configurable: true,
      value,
      writable: true
    })
  }

  const stickyStyle = new FakeStyle()
  const stickyElement = {
    getBoundingClientRect: () => ({ top: 0 }),
    style: stickyStyle
  } as unknown as HTMLElement
  const styleElement = {
    dataset: {},
    isConnected: false,
    remove() {
      this.isConnected = false
    },
    textContent: ""
  }
  const fakeWindow = {
    innerHeight: 720,
    innerWidth: 1280,
    scrollX: 0,
    scrollY: 1_000,
    scrollTo(x: number, y: number) {
      this.scrollX = x
      this.scrollY = y
    }
  }
  const dimensions = {
    clientHeight: 720,
    clientWidth: 1280,
    offsetHeight: 4_000,
    scrollHeight: 4_000,
    scrollWidth: 1280
  }
  const fakeDocument = {
    body: dimensions,
    createElement: () => styleElement as unknown as HTMLStyleElement,
    documentElement: {
      ...dimensions,
      append(element: typeof styleElement) {
        element.isConnected = true
      }
    },
    fonts: { ready: Promise.resolve() },
    querySelectorAll: () => [stickyElement],
    title: "Sticky fixture"
  }

  setGlobal("document", fakeDocument)
  setGlobal("getComputedStyle", () => ({ position: "sticky" }))
  setGlobal("location", { href: "https://example.com/sticky" })
  setGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  setGlobal("window", fakeWindow)

  try {
    await preparePageForCapture("capture-id")
    await positionPageForCapture(720)

    assert.equal(
      stickyStyle.getPropertyValue("visibility"),
      "hidden",
      "the sticky element should only appear in the first capture frame"
    )

    restorePageAfterCapture()
    assert.equal(fakeWindow.scrollY, 1_000)
  } finally {
    for (const [name, descriptor] of originalGlobals) {
      if (descriptor) {
        Object.defineProperty(globalThis, name, descriptor)
      } else {
        Reflect.deleteProperty(globalThis, name)
      }
    }
  }
})
