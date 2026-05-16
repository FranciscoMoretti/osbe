import type { ClipImage, ClipMode, ClipPayload } from "~lib/clip-types"

export async function requestClipFromTab(
  tabId: number,
  mode: ClipMode,
  includeImages: boolean,
  includeTemplate = true
) {
  try {
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId },
      func: createClipInPage,
      args: [mode, includeImages, includeTemplate]
    })

    if (!injection?.result) {
      throw new Error("The page did not return clipped content.")
    }

    return injection.result
  } catch (error) {
    throw userFacingError(error)
  }
}

export async function copyMarkdownToTab(tabId: number, markdown: string) {
  try {
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId },
      func: copyMarkdownInPage,
      args: [markdown]
    })

    if (!injection?.result?.copied) {
      throw new Error("Chrome rejected the clipboard write for this page.")
    }
  } catch (error) {
    throw userFacingError(error)
  }
}

export async function showNoticeInTab(
  tabId: number,
  message: string,
  level: "success" | "error"
) {
  await chrome.scripting
    .executeScript({
      target: { tabId },
      func: showNoticeInPage,
      args: [message, level]
    })
    .catch(() => undefined)
}

function createClipInPage(
  mode: ClipMode,
  includeImages: boolean,
  includeTemplate: boolean
): ClipPayload {
  type MarkdownImage = ClipImage & { originalUrl: string }

  const blockedSelector =
    "script, style, noscript, iframe, canvas, svg, form, button, input, select, textarea, plasmo-csui, [data-plasmo-shadow-host]"
  const imageExtensions = new Set([
    "apng",
    "avif",
    "gif",
    "jpeg",
    "jpg",
    "png",
    "svg",
    "webp"
  ])

  const root = mode === "selection" ? cloneSelection() : clonePage()
  cleanup(root)

  const images = includeImages ? rewriteImages(root) : collectRemoteImages(root)
  const title = normalizeWhitespace(document.title) || "Untitled page"
  const sourceUrl = window.location.href
  const createdAt = new Date().toISOString()
  const markdownBody = markdownForChildren(root).trim()
  const markdown = includeTemplate
    ? withFrontMatter(markdownBody, {
        title,
        sourceUrl,
        createdAt
      })
    : markdownBody

  return {
    title,
    sourceUrl,
    markdown,
    images,
    includeImages,
    createdAt
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

  function cleanup(rootElement: HTMLElement) {
    rootElement
      .querySelectorAll(blockedSelector)
      .forEach((node) => node.remove())

    rootElement.querySelectorAll("*").forEach((node) => {
      for (const attribute of Array.from(node.attributes)) {
        if (attribute.name.startsWith("on") || attribute.name === "style") {
          node.removeAttribute(attribute.name)
        }
      }
    })
  }

  function rewriteImages(rootElement: HTMLElement): MarkdownImage[] {
    const collectedImages: MarkdownImage[] = []
    const usedFilenames = new Set<string>()

    rootElement.querySelectorAll("img").forEach((image, index) => {
      const url = getImageUrl(image)

      if (!url) {
        image.remove()
        return
      }

      const filename = uniqueFilename(url, index + 1, usedFilenames)

      usedFilenames.add(filename)
      collectedImages.push({
        url,
        originalUrl: url,
        filename,
        alt: image.getAttribute("alt") || undefined
      })
      image.setAttribute("src", filename)
    })

    return collectedImages
  }

  function collectRemoteImages(rootElement: HTMLElement): MarkdownImage[] {
    const collectedImages: MarkdownImage[] = []

    rootElement.querySelectorAll("img").forEach((image, index) => {
      const url = getImageUrl(image)

      if (!url) {
        image.remove()
        return
      }

      collectedImages.push({
        url,
        originalUrl: url,
        filename: uniqueFilename(url, index + 1, new Set()),
        alt: image.getAttribute("alt") || undefined
      })
      image.setAttribute("src", url)
    })

    return collectedImages
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
        const width = descriptor.endsWith("w")
          ? Number.parseInt(descriptor, 10)
          : 0
        const density = descriptor.endsWith("x")
          ? Number.parseFloat(descriptor)
          : 0

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
    const normalized = extension
      ?.replace("jpeg", "jpg")
      .replace("svg+xml", "svg")

    return normalized && imageExtensions.has(normalized) ? normalized : "png"
  }

  function markdownForChildren(element: Node) {
    return normalizeBlock(
      Array.from(element.childNodes)
        .map((child) => markdownForNode(child))
        .join("")
    )
  }

  function markdownForNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return normalizeWhitespace(node.textContent || "")
    }

    if (!(node instanceof HTMLElement)) {
      return ""
    }

    const tagName = node.tagName.toLowerCase()
    const children = () => markdownForChildren(node)

    if (/^h[1-6]$/.test(tagName)) {
      return block(`${"#".repeat(Number(tagName[1]))} ${children().trim()}`)
    }

    switch (tagName) {
      case "article":
      case "main":
      case "section":
      case "div":
      case "span":
        return children()
      case "p":
        return block(children().trim())
      case "br":
        return "  \n"
      case "strong":
      case "b":
        return `**${children().trim()}**`
      case "em":
      case "i":
        return `_${children().trim()}_`
      case "s":
      case "del":
        return `~~${children().trim()}~~`
      case "a": {
        const text = children().trim() || node.getAttribute("href") || ""
        const href = node.getAttribute("href")

        if (!href) {
          return text
        }

        return `[${escapeLinkText(text)}](${absoluteUrl(href)})`
      }
      case "img": {
        const src = node.getAttribute("src")

        if (!src) {
          return ""
        }

        return `![${escapeLinkText(node.getAttribute("alt") || "")}](${src})`
      }
      case "pre": {
        const code = node.querySelector("code") || node
        const text = code.textContent || ""
        const fence = longestFence(text)
        const language = detectLanguage(code) || detectLanguage(node)

        return `\n\n${fence}${language}\n${text.replace(/\n$/, "")}\n${fence}\n\n`
      }
      case "code":
        return inlineCode(node.textContent || "")
      case "blockquote":
        return block(
          children()
            .trim()
            .split("\n")
            .map((line) => `> ${line}`)
            .join("\n")
        )
      case "ul":
        return listItems(node, false)
      case "ol":
        return listItems(node, true)
      case "li":
        return children().trim()
      case "table":
        return tableMarkdown(node)
      case "thead":
      case "tbody":
      case "tr":
      case "th":
      case "td":
        return children()
      default:
        return children()
    }
  }

  function listItems(list: HTMLElement, ordered: boolean) {
    const items = Array.from(list.children).filter(
      (child) =>
        child instanceof HTMLElement && child.tagName.toLowerCase() === "li"
    )

    return block(
      items
        .map((item, index) => {
          const marker = ordered ? `${index + 1}.` : "-"
          const text = markdownForChildren(item).trim().replace(/\n/g, "\n  ")

          return `${marker} ${text}`
        })
        .join("\n")
    )
  }

  function tableMarkdown(table: HTMLElement) {
    const rows = Array.from(table.querySelectorAll("tr")).map((row) =>
      Array.from(row.querySelectorAll("th,td")).map((cell) =>
        markdownForChildren(cell).replace(/\|/g, "\\|").trim()
      )
    )

    if (rows.length === 0) {
      return ""
    }

    const columnCount = Math.max(...rows.map((row) => row.length))
    const normalizedRows = rows.map((row) => [
      ...row,
      ...Array.from({ length: columnCount - row.length }, () => "")
    ])
    const [header, ...bodyRows] = normalizedRows

    return block(
      [
        `| ${header.join(" | ")} |`,
        `| ${Array.from({ length: columnCount }, () => "---").join(" | ")} |`,
        ...bodyRows.map((row) => `| ${row.join(" | ")} |`)
      ].join("\n")
    )
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

  function absoluteUrl(url: string) {
    try {
      return new URL(url, window.location.href).href
    } catch {
      return url
    }
  }

  function block(value: string) {
    return value ? `\n\n${value}\n\n` : ""
  }

  function normalizeBlock(value: string) {
    return value.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n")
  }

  function normalizeWhitespace(value: string) {
    return value.replace(/\s+/g, " ")
  }

  function escapeLinkText(value: string) {
    return value.replace(/[[\]]/g, "\\$&")
  }

  function inlineCode(value: string) {
    const ticks = value.match(/`+/g)
    const delimiter = "`".repeat(
      Math.max(1, ...(ticks || []).map((tick) => tick.length)) + 1
    )

    return `${delimiter}${value}${delimiter}`
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
      `title: ${JSON.stringify(metadata.title)}`,
      `source: ${JSON.stringify(metadata.sourceUrl)}`,
      `clipped: ${JSON.stringify(metadata.createdAt)}`,
      "---",
      "",
      markdown
    ].join("\n")
  }
}

function userFacingError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)

  if (
    message.includes("Receiving end does not exist") ||
    message.includes("Could not establish connection")
  ) {
    return new Error(
      "This tab is not ready for clipping yet. Reload the page and try again."
    )
  }

  if (
    message.includes("Cannot access contents of") ||
    message.includes("Cannot access a chrome://") ||
    message.includes("The extensions gallery cannot be scripted")
  ) {
    return new Error(
      "Chrome does not allow extensions to clip this page. Try a normal web page and reload it if needed."
    )
  }

  return error instanceof Error ? error : new Error(message)
}

async function copyMarkdownInPage(markdown: string) {
  try {
    await navigator.clipboard.writeText(markdown)
    return { copied: true }
  } catch {
    // Some pages reject async clipboard writes from extension-injected code.
    // execCommand still works on many of those pages.
  }

  const selection = window.getSelection()
  const ranges =
    selection && selection.rangeCount > 0
      ? Array.from({ length: selection.rangeCount }, (_, index) =>
          selection.getRangeAt(index).cloneRange()
        )
      : []
  const activeElement =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
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

  return { copied }
}

function showNoticeInPage(message: string, level: "success" | "error") {
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
    '13px/1.4 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  notice.style.color = level === "success" ? "#052e16" : "#7f1d1d"
  notice.style.background = level === "success" ? "#dcfce7" : "#fee2e2"
  notice.style.border =
    level === "success" ? "1px solid #86efac" : "1px solid #fecaca"

  document.documentElement.append(notice)
  setTimeout(() => notice.remove(), level === "success" ? 2400 : 5200)
}
