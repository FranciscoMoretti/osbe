import TurndownService from "turndown"
import type { PlasmoCSConfig } from "plasmo"

import {
  CLIP_MESSAGE,
  COPY_MARKDOWN_MESSAGE,
  NOTICE_MESSAGE,
  type ClipImage,
  type ClipMode,
  type ClipPayload,
  type ClipRequest,
  type CopyMarkdownRequest,
  type ExtensionResponse
} from "~lib/clip-types"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"]
}

const BLOCKED_SELECTOR =
  "script, style, noscript, iframe, canvas, svg, form, button, input, select, textarea, plasmo-csui, [data-plasmo-shadow-host]"

const IMAGE_EXTENSIONS = new Set([
  "apng",
  "avif",
  "gif",
  "jpeg",
  "jpg",
  "png",
  "svg",
  "webp"
])

chrome.runtime.onMessage.addListener(
  (
    message:
      | ClipRequest
      | CopyMarkdownRequest
      | { type: typeof NOTICE_MESSAGE; level: "success" | "error"; message: string },
    _sender,
    sendResponse
  ) => {
    if (message?.type === COPY_MARKDOWN_MESSAGE) {
      copyMarkdownToClipboard(message.markdown)
        .then(() => {
          const response: ExtensionResponse<{ copied: true }> = {
            ok: true,
            data: { copied: true }
          }

          sendResponse(response)
        })
        .catch((error) => {
          const response: ExtensionResponse = {
            ok: false,
            error: error instanceof Error ? error.message : "Could not copy Markdown"
          }

          sendResponse(response)
        })

      return true
    }

    if (message?.type === NOTICE_MESSAGE) {
      showNotice(message.message, message.level)
      return false
    }

    if (message?.type !== CLIP_MESSAGE) {
      return false
    }

    createClip(message.mode, message.includeImages)
      .then((payload) => {
        const response: ExtensionResponse<ClipPayload> = {
          ok: true,
          data: payload
        }

        sendResponse(response)
      })
      .catch((error) => {
        const response: ExtensionResponse = {
          ok: false,
          error: error instanceof Error ? error.message : "Could not create clip"
        }

        sendResponse(response)
      })

    return true
  }
)

async function copyMarkdownToClipboard(markdown: string) {
  try {
    await navigator.clipboard.writeText(markdown)
    return
  } catch {
    // Some pages reject async clipboard writes from extension messages.
    // execCommand uses the focused page document and still works on those sites.
  }

  const selection = window.getSelection()
  const ranges =
    selection && selection.rangeCount > 0
      ? Array.from({ length: selection.rangeCount }, (_, index) =>
          selection.getRangeAt(index).cloneRange()
        )
      : []
  const activeElement =
    document.activeElement instanceof HTMLElement ? document.activeElement : null
  const textarea = document.createElement("textarea")

  textarea.value = markdown
  textarea.setAttribute("readonly", "true")
  textarea.style.position = "fixed"
  textarea.style.inset = "0 auto auto 0"
  textarea.style.width = "1px"
  textarea.style.height = "1px"
  textarea.style.opacity = "0"
  textarea.style.pointerEvents = "none"
  textarea.style.zIndex = "2147483647"

  document.documentElement.append(textarea)
  textarea.focus()
  textarea.select()

  const copied = document.execCommand("copy")

  textarea.remove()

  if (selection) {
    selection.removeAllRanges()
    ranges.forEach((range) => selection.addRange(range))
  }

  activeElement?.focus({ preventScroll: true })

  if (!copied) {
    throw new Error("Chrome rejected the clipboard write for this page.")
  }
}

function showNotice(message: string, level: "success" | "error") {
  const existing = document.getElementById("osbe-markdown-clipper-notice")
  existing?.remove()

  const notice = document.createElement("div")
  notice.id = "osbe-markdown-clipper-notice"
  notice.textContent = message
  notice.style.position = "fixed"
  notice.style.right = "16px"
  notice.style.bottom = "16px"
  notice.style.zIndex = "2147483647"
  notice.style.maxWidth = "360px"
  notice.style.padding = "10px 12px"
  notice.style.borderRadius = "8px"
  notice.style.boxShadow = "0 12px 32px rgba(15, 23, 42, 0.24)"
  notice.style.font =
    '13px/1.4 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  notice.style.color = level === "success" ? "#052e16" : "#7f1d1d"
  notice.style.background = level === "success" ? "#dcfce7" : "#fee2e2"
  notice.style.border =
    level === "success" ? "1px solid #86efac" : "1px solid #fecaca"

  document.documentElement.append(notice)
  setTimeout(() => notice.remove(), level === "success" ? 2400 : 5200)
}

async function createClip(
  mode: ClipMode,
  includeImages: boolean
): Promise<ClipPayload> {
  const root = mode === "selection" ? cloneSelection() : clonePage()
  const images = includeImages ? rewriteImages(root) : collectRemoteImages(root)

  cleanup(root)

  const markdown = buildMarkdown(root, images, includeImages)
  const title = normalizeWhitespace(document.title) || "Untitled page"
  const sourceUrl = window.location.href
  const createdAt = new Date().toISOString()

  return {
    title,
    sourceUrl,
    markdown: withFrontMatter(markdown, { title, sourceUrl, createdAt }),
    images,
    includeImages,
    createdAt
  }
}

function clonePage() {
  const wrapper = document.createElement("article")
  const source = document.body || document.documentElement

  wrapper.append(source.cloneNode(true))

  return wrapper
}

function cloneSelection() {
  const selection = window.getSelection()

  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    throw new Error("Select text or page content before clipping.")
  }

  const wrapper = document.createElement("article")

  for (let index = 0; index < selection.rangeCount; index += 1) {
    wrapper.append(selection.getRangeAt(index).cloneContents())
  }

  return wrapper
}

function cleanup(root: HTMLElement) {
  root.querySelectorAll(BLOCKED_SELECTOR).forEach((node) => node.remove())

  root.querySelectorAll("*").forEach((node) => {
    for (const attribute of Array.from(node.attributes)) {
      if (
        attribute.name.startsWith("on") ||
        attribute.name === "style"
      ) {
        node.removeAttribute(attribute.name)
      }
    }
  })
}

function rewriteImages(root: HTMLElement): ClipImage[] {
  const images: ClipImage[] = []
  const usedFilenames = new Set<string>()

  root.querySelectorAll("img").forEach((image, index) => {
    const url = getImageUrl(image)

    if (!url) {
      image.remove()
      return
    }

    const filename = uniqueFilename(url, index + 1, usedFilenames)

    usedFilenames.add(filename)
    images.push({
      url,
      filename,
      alt: image.getAttribute("alt") || undefined
    })

    image.setAttribute("src", filename)
  })

  return images
}

function collectRemoteImages(root: HTMLElement): ClipImage[] {
  const images: ClipImage[] = []

  root.querySelectorAll("img").forEach((image, index) => {
    const url = getImageUrl(image)

    if (!url) {
      image.remove()
      return
    }

    images.push({
      url,
      filename: uniqueFilename(url, index + 1, new Set()),
      alt: image.getAttribute("alt") || undefined
    })

    image.setAttribute("src", url)
  })

  return images
}

function getImageUrl(image: HTMLImageElement) {
  const raw =
    image.currentSrc ||
    image.getAttribute("src") ||
    image.getAttribute("data-original-src") ||
    image.getAttribute("data-src") ||
    image.getAttribute("data-original") ||
    image.getAttribute("data-lazy-src") ||
    bestSrcsetCandidate(image.getAttribute("srcset")) ||
    bestSrcsetCandidate(image.getAttribute("data-srcset")) ||
    bestPictureSourceCandidate(image)

  if (!raw) {
    return null
  }

  try {
    return new URL(raw, window.location.href).href
  } catch {
    return raw.startsWith("data:image/") ? raw : null
  }
}

function bestPictureSourceCandidate(image: HTMLImageElement) {
  const picture = image.closest("picture")
  const sources = Array.from(picture?.querySelectorAll("source") || [])

  for (const source of sources) {
    const candidate =
      bestSrcsetCandidate(source.getAttribute("srcset")) ||
      source.getAttribute("src")

    if (candidate) {
      return candidate
    }
  }

  return null
}

function bestSrcsetCandidate(srcset: string | null) {
  if (!srcset) {
    return null
  }

  const candidates = srcset
    .split(",")
    .map((candidate) => {
      const [url, descriptor = ""] = candidate.trim().split(/\s+/, 2)
      const width = descriptor.endsWith("w") ? Number.parseInt(descriptor, 10) : 0
      const density = descriptor.endsWith("x") ? Number.parseFloat(descriptor) : 0

      return { url, score: width || density || 1 }
    })
    .filter((candidate) => candidate.url)
    .sort((a, b) => b.score - a.score)

  return candidates[0]?.url || null
}

function uniqueFilename(url: string, index: number, used: Set<string>) {
  const extension = imageExtension(url)
  const base = `image-${String(index).padStart(3, "0")}.${extension}`
  let filename = `assets/${base}`
  let suffix = 2

  while (used.has(filename)) {
    filename = `assets/image-${String(index).padStart(3, "0")}-${suffix}.${extension}`
    suffix += 1
  }

  return filename
}

function imageExtension(url: string) {
  if (url.startsWith("data:image/")) {
    const match = url.match(/^data:image\/([a-z0-9.+-]+)[;,]/i)
    return normalizeExtension(match?.[1])
  }

  try {
    const pathname = new URL(url).pathname
    const extension = pathname.split(".").pop()?.toLowerCase()
    return normalizeExtension(extension)
  } catch {
    return "png"
  }
}

function normalizeExtension(extension?: string) {
  const normalized = extension?.replace("jpeg", "jpg").replace("svg+xml", "svg")

  return normalized && IMAGE_EXTENSIONS.has(normalized) ? normalized : "png"
}

function buildMarkdown(
  root: HTMLElement,
  images: ClipImage[],
  includeImages: boolean
) {
  const turndown = new TurndownService({
    codeBlockStyle: "fenced",
    headingStyle: "atx",
    bulletListMarker: "-",
    emDelimiter: "_"
  })

  turndown.addRule("fencedCodeBlockWithLanguage", {
    filter: (node) => node.nodeName === "PRE",
    replacement: (_content, node) => {
      const pre = node as HTMLElement
      const code = pre.querySelector("code") || pre
      const language = detectLanguage(code) || detectLanguage(pre)
      const text = code.textContent || ""
      const fence = longestFence(text)

      return `\n\n${fence}${language}\n${text.replace(/\n$/, "")}\n${fence}\n\n`
    }
  })

  turndown.addRule("picture", {
    filter: "picture",
    replacement: (content) => content
  })

  const markdown = turndown
    .turndown(root)
    .replace(/\n{3,}/g, "\n\n")
    .trim()

  if (!includeImages || images.length === 0) {
    return markdown
  }

  return markdown
}

function detectLanguage(element: Element) {
  const candidates = [
    element.getAttribute("data-language"),
    element.getAttribute("data-lang"),
    element.getAttribute("lang"),
    element.className
  ]

  for (const candidate of candidates) {
    const value = String(candidate || "")
    const language =
      value.match(/(?:^|\s)(?:language|lang)-([a-z0-9_+#.-]+)/i)?.[1] ||
      value.match(/(?:^|\s)highlight-source-([a-z0-9_+#.-]+)/i)?.[1] ||
      value.match(/(?:^|\s)source-([a-z0-9_+#.-]+)/i)?.[1] ||
      value.match(/brush:\s*([a-z0-9_+#.-]+)/i)?.[1]

    if (language) {
      return language.toLowerCase()
    }
  }

  return ""
}

function longestFence(text: string) {
  const longest = Math.max(
    2,
    ...Array.from(text.matchAll(/`+/g), (match) => match[0].length)
  )

  return "`".repeat(longest + 1)
}

function withFrontMatter(
  markdown: string,
  metadata: { title: string; sourceUrl: string; createdAt: string }
) {
  return [
    "---",
    `title: ${yamlQuote(metadata.title)}`,
    `source: ${yamlQuote(metadata.sourceUrl)}`,
    `clipped: ${yamlQuote(metadata.createdAt)}`,
    "---",
    "",
    markdown
  ].join("\n")
}

function yamlQuote(value: string) {
  return JSON.stringify(value)
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim()
}
