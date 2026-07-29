import { executeInTab, getActiveTab } from "@osbe/extension-kit/tabs"

import type { ResizePreset } from "./presets"

type WindowBounds = {
  height?: number
  id?: number
  state?: chrome.windows.Window["state"]
  width?: number
}

type WindowUpdate = Pick<
  chrome.windows.UpdateInfo,
  "height" | "state" | "width"
>

export type WindowAdapter = {
  getCurrent(): Promise<WindowBounds>
  getViewport(windowId: number): Promise<WindowSize>
  update(windowId: number, update: WindowUpdate): Promise<WindowBounds>
}

export type WindowSize = {
  height: number
  width: number
}

export type WindowMetrics = {
  viewport: WindowSize | null
  window: WindowSize
}

export async function readCurrentWindowMetrics(
  adapter = createWindowAdapter()
): Promise<WindowMetrics> {
  const currentWindow = await adapter.getCurrent()

  if (currentWindow.id === undefined) {
    throw new Error("Chrome did not return a window to measure.")
  }

  return {
    window: getWindowSize(currentWindow),
    viewport: await readViewport(adapter, currentWindow.id)
  }
}

export async function resizeCurrentWindow(
  preset: Pick<ResizePreset, "height" | "target" | "width">,
  adapter = createWindowAdapter()
): Promise<WindowMetrics> {
  const currentWindow = await adapter.getCurrent()

  if (currentWindow.id === undefined) {
    throw new Error("Chrome did not return a window to resize.")
  }

  const currentWindowSize = getWindowSize(currentWindow)
  const currentViewportSize =
    preset.target === "viewport"
      ? await adapter.getViewport(currentWindow.id)
      : null
  const updateSize = currentViewportSize
    ? {
        width:
          preset.width + currentWindowSize.width - currentViewportSize.width,
        height:
          preset.height + currentWindowSize.height - currentViewportSize.height
      }
    : {
        width: preset.width,
        height: preset.height
      }
  let resizedWindow = await adapter.update(currentWindow.id, {
    state: "normal",
    ...updateSize
  })
  let windowSize = {
    width: resizedWindow.width ?? updateSize.width,
    height: resizedWindow.height ?? updateSize.height
  }
  let viewportSize = await readViewport(adapter, currentWindow.id)

  if (
    currentViewportSize &&
    viewportSize &&
    (viewportSize.width !== preset.width ||
      viewportSize.height !== preset.height)
  ) {
    const correctedSize = {
      width: windowSize.width + preset.width - viewportSize.width,
      height: windowSize.height + preset.height - viewportSize.height
    }
    resizedWindow = await adapter.update(currentWindow.id, {
      state: "normal",
      ...correctedSize
    })
    windowSize = {
      width: resizedWindow.width ?? correctedSize.width,
      height: resizedWindow.height ?? correctedSize.height
    }
    viewportSize = await readViewport(adapter, currentWindow.id)
  }

  return {
    window: windowSize,
    viewport:
      viewportSize ??
      (currentViewportSize
        ? { width: preset.width, height: preset.height }
        : null)
  }
}

function createWindowAdapter(): WindowAdapter {
  if (
    typeof chrome !== "undefined" &&
    chrome.windows?.getCurrent &&
    chrome.scripting?.executeScript
  ) {
    return {
      getCurrent: () => chrome.windows.getCurrent(),
      async getViewport(windowId) {
        const activeTab = await getActiveTab()

        if (activeTab.id === undefined || activeTab.windowId !== windowId) {
          throw new Error("Chrome did not return an active tab to measure.")
        }

        try {
          const viewport = await executeInTab(
            activeTab.id,
            () => ({
              height: globalThis.innerHeight,
              width: globalThis.innerWidth
            }),
            []
          )

          if (
            !viewport ||
            !Number.isFinite(viewport.width) ||
            !Number.isFinite(viewport.height)
          ) {
            throw new Error("The active tab did not return its viewport size.")
          }

          return viewport
        } catch {
          throw new Error(
            "Viewport resizing is unavailable on this browser page."
          )
        }
      },
      update: (windowId, update) => chrome.windows.update(windowId, update)
    }
  }

  return {
    async getCurrent() {
      return {
        id: 1,
        width: window.outerWidth,
        height: window.outerHeight,
        state: "normal"
      }
    },
    async getViewport() {
      return {
        width: window.innerWidth,
        height: window.innerHeight
      }
    },
    async update(_windowId, update) {
      return {
        id: 1,
        width: update.width,
        height: update.height,
        state: "normal"
      }
    }
  }
}

function getWindowSize(currentWindow: WindowBounds): WindowSize {
  return {
    width: currentWindow.width ?? window.outerWidth,
    height: currentWindow.height ?? window.outerHeight
  }
}

async function readViewport(
  adapter: WindowAdapter,
  windowId: number
): Promise<WindowSize | null> {
  try {
    return await adapter.getViewport(windowId)
  } catch {
    return null
  }
}
