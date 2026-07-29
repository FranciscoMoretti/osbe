import type { WindowPreset } from "./presets"

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
  update(windowId: number, update: WindowUpdate): Promise<WindowBounds>
}

export type WindowSize = {
  height: number
  width: number
}

export async function readCurrentWindowSize(
  adapter = createWindowAdapter()
): Promise<WindowSize> {
  const currentWindow = await adapter.getCurrent()

  return {
    width: currentWindow.width ?? window.outerWidth,
    height: currentWindow.height ?? window.outerHeight
  }
}

export async function resizeCurrentWindow(
  preset: Pick<WindowPreset, "height" | "width">,
  adapter = createWindowAdapter()
): Promise<WindowSize> {
  const currentWindow = await adapter.getCurrent()

  if (currentWindow.id === undefined) {
    throw new Error("Chrome did not return a window to resize.")
  }

  const resizedWindow = await adapter.update(currentWindow.id, {
    state: "normal",
    width: preset.width,
    height: preset.height
  })

  return {
    width: resizedWindow.width ?? preset.width,
    height: resizedWindow.height ?? preset.height
  }
}

function createWindowAdapter(): WindowAdapter {
  if (typeof chrome !== "undefined" && chrome.windows?.getCurrent) {
    return {
      getCurrent: () => chrome.windows.getCurrent(),
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
    async update(_windowId, update) {
      if (update.width && update.height) {
        window.resizeTo(update.width, update.height)
      }

      return {
        id: 1,
        width: update.width,
        height: update.height,
        state: "normal"
      }
    }
  }
}
