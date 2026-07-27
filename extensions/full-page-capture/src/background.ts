import { getNextScrollY } from "./lib/capture-math"
import type {
  CaptureMessage,
  CaptureMetadata
} from "./lib/capture-types"

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

      if (nextY === null) break
      requestedY = nextY
    }

    if (frameCount >= MAX_CAPTURE_FRAMES) {
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

function preparePageForCapture(captureId: string) {
  type CapturedElement = {
    element: HTMLElement
    documentTop: number
    position: "fixed" | "sticky"
    visibility: string
    visibilityPriority: string
  }
  type PageState = {
    captureId: string
    originalScrollX: number
    originalScrollY: number
    elements: CapturedElement[]
    styleElement: HTMLStyleElement
  }

  const stateKey = "__osbeFullPageCaptureState"
  const pageWindow = window as typeof window & {
    [stateKey]?: PageState
  }
  const existingState = pageWindow[stateKey]

  if (existingState?.styleElement.isConnected) {
    existingState.styleElement.remove()
  }

  const styleElement = document.createElement("style")
  styleElement.dataset.osbeFullPageCapture = captureId
  styleElement.textContent = `
    html { scroll-behavior: auto !important; }
    *, *::before, *::after {
      animation-delay: 0s !important;
      animation-duration: 0s !important;
      caret-color: transparent !important;
      scroll-behavior: auto !important;
      transition-delay: 0s !important;
      transition-duration: 0s !important;
    }
    html::-webkit-scrollbar, body::-webkit-scrollbar { display: none !important; }
    html, body { scrollbar-width: none !important; }
  `
  document.documentElement.append(styleElement)

  const elements: CapturedElement[] = []
  for (const element of document.querySelectorAll<HTMLElement>("body *")) {
    const computedStyle = getComputedStyle(element)
    if (
      computedStyle.position !== "fixed" &&
      computedStyle.position !== "sticky"
    ) {
      continue
    }

    elements.push({
      element,
      documentTop: element.getBoundingClientRect().top + window.scrollY,
      position: computedStyle.position,
      visibility: element.style.getPropertyValue("visibility"),
      visibilityPriority:
        element.style.getPropertyPriority("visibility")
    })
  }

  pageWindow[stateKey] = {
    captureId,
    originalScrollX: window.scrollX,
    originalScrollY: window.scrollY,
    elements,
    styleElement
  }

  const getDocumentHeight = () =>
    Math.max(
      document.body?.scrollHeight ?? 0,
      document.body?.offsetHeight ?? 0,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight,
      document.documentElement.clientHeight
    )

  window.scrollTo(0, 0)

  return Promise.resolve(document.fonts?.ready)
    .catch(() => undefined)
    .then(() => ({
      title: document.title || new URL(location.href).hostname,
      url: location.href,
      documentWidth: Math.max(
        document.body?.scrollWidth ?? 0,
        document.documentElement.scrollWidth,
        document.documentElement.clientWidth
      ),
      documentHeight: getDocumentHeight(),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight
    }))
}

async function positionPageForCapture(requestedY: number) {
  type CapturedElement = {
    element: HTMLElement
    documentTop: number
    position: "fixed" | "sticky"
    visibility: string
    visibilityPriority: string
  }
  type PageState = {
    elements: CapturedElement[]
  }

  const stateKey = "__osbeFullPageCaptureState"
  const pageWindow = window as typeof window & {
    [stateKey]?: PageState
  }

  window.scrollTo(0, requestedY)
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() =>
      requestAnimationFrame(() => resolve())
    )
  )
  await new Promise((resolve) => setTimeout(resolve, 120))

  const scrollY = window.scrollY
  const pageState = pageWindow[stateKey]

  for (const captured of pageState?.elements ?? []) {
    const shouldHide =
      captured.position === "fixed"
        ? scrollY > 0
        : scrollY > captured.documentTop + 1

    if (shouldHide) {
      captured.element.style.setProperty("visibility", "hidden", "important")
    } else if (captured.visibility) {
      captured.element.style.setProperty(
        "visibility",
        captured.visibility,
        captured.visibilityPriority
      )
    } else {
      captured.element.style.removeProperty("visibility")
    }
  }

  const documentHeight = Math.max(
    document.body?.scrollHeight ?? 0,
    document.body?.offsetHeight ?? 0,
    document.documentElement.scrollHeight,
    document.documentElement.offsetHeight,
    document.documentElement.clientHeight
  )

  return {
    scrollY,
    documentHeight,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight
  }
}

function restorePageAfterCapture() {
  type CapturedElement = {
    element: HTMLElement
    visibility: string
    visibilityPriority: string
  }
  type PageState = {
    originalScrollX: number
    originalScrollY: number
    elements: CapturedElement[]
    styleElement: HTMLStyleElement
  }

  const stateKey = "__osbeFullPageCaptureState"
  const pageWindow = window as typeof window & {
    [stateKey]?: PageState
  }
  const pageState = pageWindow[stateKey]

  if (!pageState) return

  for (const captured of pageState.elements) {
    if (captured.visibility) {
      captured.element.style.setProperty(
        "visibility",
        captured.visibility,
        captured.visibilityPriority
      )
    } else {
      captured.element.style.removeProperty("visibility")
    }
  }

  pageState.styleElement.remove()
  window.scrollTo(pageState.originalScrollX, pageState.originalScrollY)
  delete pageWindow[stateKey]
}
