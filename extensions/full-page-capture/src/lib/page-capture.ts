interface CapturedPageElement {
  element: HTMLElement
  documentTop: number
  position: "fixed" | "sticky"
  visibility: string
  visibilityPriority: string
}

interface CapturedPageState {
  captureId: string
  originalScrollX: number
  originalScrollY: number
  elements: CapturedPageElement[]
  styleElement: HTMLStyleElement
}

export async function preparePageForCapture(captureId: string) {
  const stateKey = "__osbeFullPageCaptureState"
  const pageWindow = window as typeof window & {
    [stateKey]?: CapturedPageState
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

  const originalScrollX = window.scrollX
  const originalScrollY = window.scrollY

  window.scrollTo(0, 0)
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  )
  await Promise.resolve(document.fonts?.ready).catch(() => undefined)

  const elements: CapturedPageElement[] = []
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
      visibilityPriority: element.style.getPropertyPriority("visibility")
    })
  }

  pageWindow[stateKey] = {
    captureId,
    originalScrollX,
    originalScrollY,
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

  return {
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
  }
}

export async function positionPageForCapture(requestedY: number) {
  const stateKey = "__osbeFullPageCaptureState"
  const pageWindow = window as typeof window & {
    [stateKey]?: CapturedPageState
  }

  window.scrollTo(0, requestedY)
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
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

export function restorePageAfterCapture() {
  const stateKey = "__osbeFullPageCaptureState"
  const pageWindow = window as typeof window & {
    [stateKey]?: CapturedPageState
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
