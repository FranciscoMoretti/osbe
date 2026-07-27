import { getNextScrollY } from "./lib/capture-math"
import type {
  CaptureMessage,
  CaptureMetadata
} from "./lib/capture-types"
import {
  positionPageForCapture,
  preparePageForCapture,
  restorePageAfterCapture
} from "./lib/page-capture"

const MAX_CAPTURE_FRAMES = 200
const CAPTURE_INTERVAL_MS = 600
const PREVIEW_CONNECTION_TIMEOUT_MS = 15_000
const activeCaptures = new Set<number>()
const previewPorts = new Map<string, chrome.runtime.Port>()
const previewWaiters = new Map<
  string,
  (port: chrome.runtime.Port) => void
>()

chrome.runtime.onConnect.addListener((port) => {
  if (!port.name.startsWith("capture:")) return

  const captureId = port.name.slice("capture:".length)
  const markPreviewReady = (message: unknown) => {
    if (
      !message ||
      typeof message !== "object" ||
      !("type" in message) ||
      message.type !== "preview-ready"
    ) {
      return
    }

    port.onMessage.removeListener(markPreviewReady)
    const resolve = previewWaiters.get(captureId)

    if (resolve) {
      previewWaiters.delete(captureId)
      resolve(port)
    } else {
      previewPorts.set(captureId, port)
    }
  }

  port.onMessage.addListener(markPreviewReady)
  port.onDisconnect.addListener(() => {
    if (previewPorts.get(captureId) === port) {
      previewPorts.delete(captureId)
    }
  })
})

chrome.action.onClicked.addListener((tab) => {
  if (typeof tab.id !== "number" || typeof tab.windowId !== "number") {
    return
  }

  if (activeCaptures.has(tab.id)) return
  activeCaptures.add(tab.id)

  void captureFullPage(tab).finally(() => {
    activeCaptures.delete(tab.id as number)
  })
})

async function captureFullPage(tab: chrome.tabs.Tab) {
  const tabId = tab.id as number
  const windowId = tab.windowId as number
  const captureId = crypto.randomUUID()
  let previewTabId: number | undefined
  let port: chrome.runtime.Port | undefined
  let pagePrepared = false

  try {
    const previewTab = await chrome.tabs.create({
      active: false,
      url: chrome.runtime.getURL(
        `tabs/capture.html?capture=${encodeURIComponent(captureId)}`
      )
    })
    previewTabId = previewTab.id
    port = await waitForPreviewConnection(captureId)

    const metadata = await runInPage(
      tabId,
      preparePageForCapture,
      captureId
    )
    pagePrepared = true

    const captureMetadata: CaptureMetadata = {
      id: captureId,
      title: metadata.title,
      url: metadata.url,
      documentWidth: metadata.documentWidth,
      documentHeight: metadata.documentHeight,
      viewportWidth: metadata.viewportWidth,
      viewportHeight: metadata.viewportHeight,
      capturedAt: new Date().toISOString()
    }

    postMessage(port, {
      type: "capture-start",
      metadata: captureMetadata
    })

    let requestedY = 0
    let frameCount = 0
    let finalDocumentHeight = metadata.documentHeight
    let lastCaptureAt = 0
    let reachedDocumentEnd = false

    while (frameCount < MAX_CAPTURE_FRAMES) {
      const activeTab = (
        await chrome.tabs.query({ active: true, windowId })
      )[0]

      if (activeTab?.id !== tabId) {
        throw new Error(
          "Keep the page tab active until its capture is complete."
        )
      }

      const position = await runInPage(
        tabId,
        positionPageForCapture,
        requestedY
      )
      finalDocumentHeight = position.documentHeight

      const captureDelay = Math.max(
        0,
        CAPTURE_INTERVAL_MS - (Date.now() - lastCaptureAt)
      )
      if (captureDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, captureDelay))
      }

      const dataUrl = await chrome.tabs.captureVisibleTab(windowId, {
        format: "png"
      })
      lastCaptureAt = Date.now()

      postMessage(port, {
        type: "capture-chunk",
        chunk: {
          dataUrl,
          index: frameCount,
          scrollY: position.scrollY,
          viewportWidth: position.viewportWidth,
          viewportHeight: position.viewportHeight,
          documentHeight: position.documentHeight
        }
      })

      frameCount += 1
      postMessage(port, {
        type: "capture-progress",
        capturedHeight: Math.min(
          position.scrollY + position.viewportHeight,
          position.documentHeight
        ),
        documentHeight: position.documentHeight,
        frameCount
      })

      const nextY = getNextScrollY({
        currentY: position.scrollY,
        documentHeight: position.documentHeight,
        viewportHeight: position.viewportHeight
      })

      if (nextY === null) {
        reachedDocumentEnd = true
        break
      }
      requestedY = nextY
    }

    if (!reachedDocumentEnd) {
      throw new Error(
        "This page kept growing while it was captured. Capture stopped after 200 screens."
      )
    }

    postMessage(port, {
      type: "capture-complete",
      documentHeight: finalDocumentHeight,
      frameCount
    })
  } catch (error) {
    const message = getCaptureErrorMessage(error)

    if (port) {
      postMessage(port, { type: "capture-error", message })
    } else if (previewTabId) {
      await chrome.tabs.update(previewTabId, {
        url: chrome.runtime.getURL(
          `tabs/capture.html?error=${encodeURIComponent(message)}`
        )
      })
    }
  } finally {
    if (pagePrepared) {
      await runInPage(tabId, restorePageAfterCapture).catch(() => undefined)
    }

    previewPorts.delete(captureId)

    if (previewTabId) {
      await chrome.tabs.update(previewTabId, { active: true }).catch(
        () => undefined
      )
    }
  }
}

function waitForPreviewConnection(captureId: string) {
  const existingPort = previewPorts.get(captureId)
  if (existingPort) {
    previewPorts.delete(captureId)
    return Promise.resolve(existingPort)
  }

  return new Promise<chrome.runtime.Port>((resolve, reject) => {
    const timeout = setTimeout(() => {
      previewWaiters.delete(captureId)
      reject(new Error("The capture preview could not be opened."))
    }, PREVIEW_CONNECTION_TIMEOUT_MS)

    previewWaiters.set(captureId, (port) => {
      clearTimeout(timeout)
      resolve(port)
    })
  })
}

function postMessage(port: chrome.runtime.Port, message: CaptureMessage) {
  port.postMessage(message)
}

async function runInPage<TArgs extends unknown[], TResult>(
  tabId: number,
  func: (...args: TArgs) => TResult | Promise<TResult>,
  ...args: TArgs
): Promise<TResult> {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func,
    args
  })

  if (!result) {
    throw new Error("The page did not return capture information.")
  }

  return result.result as TResult
}

function getCaptureErrorMessage(error: unknown) {
  const detail =
    error instanceof Error ? error.message : "The page could not be captured."

  if (
    detail.includes("Cannot access") ||
    detail.includes("The extensions gallery cannot be scripted") ||
    detail.includes("Missing host permission")
  ) {
    return "Chrome does not allow extensions to capture this protected page. Try a regular website instead."
  }

  return detail
}
