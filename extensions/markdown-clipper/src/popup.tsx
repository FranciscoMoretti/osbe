import {
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  Download,
  Eye,
  EyeOff,
  FileText,
  Image,
  Loader2,
  Moon,
  RefreshCw,
  Sun
} from "lucide-react"
import type { ReactNode } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import lightLogoUrl from "url:../assets/icon-menu.png"

import "~style.css"

import { Button } from "~components/ui/button"
import {
  DOWNLOAD_MESSAGE,
  type ClipPayload,
  type ExtensionResponse
} from "~lib/clip-types"
import { copyMarkdownToTab, requestClipFromTab } from "~lib/request-clip"

type Status = "idle" | "busy" | "done" | "error"
type Theme = "dark" | "light"

function IndexPopup() {
  const [includeImages, setIncludeImages] = useState(true)
  const [includeTemplate, setIncludeTemplate] = useState(true)
  const [previewVisible, setPreviewVisible] = useState(false)
  const [theme, setTheme] = useState<Theme>(() => preferredTheme())
  const [status, setStatus] = useState<Status>("idle")
  const [message, setMessage] = useState("Reading the current tab...")
  const [activeTabId, setActiveTabId] = useState<number | null>(null)
  const [title, setTitle] = useState("")
  const [clip, setClip] = useState<ClipPayload | null>(null)

  const markdown = useMemo(
    () => markdownWithTitle(clip?.markdown || "", title),
    [clip?.markdown, title]
  )
  const previewBlocks = useMemo(
    () => markdownPreviewBlocks(markdown),
    [markdown]
  )

  const loadClip = useCallback(async () => {
    setStatus("busy")
    setMessage("Reading the current tab...")

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      })

      if (!tab?.id) {
        throw new Error("No active tab found.")
      }

      setActiveTabId(tab.id)
      setTitle(tab.title || "Untitled page")

      const nextClip = await requestClipFromTab(
        tab.id,
        "page",
        includeImages,
        includeTemplate
      )

      setClip(nextClip)
      setTitle(nextClip.title)
      setStatus("idle")
      setMessage("Ready.")
    } catch (error) {
      setClip(null)
      setStatus("error")
      setMessage(
        error instanceof Error
          ? error.message
          : "The page could not be clipped."
      )
    }
  }, [includeImages, includeTemplate])

  useEffect(() => {
    void loadClip()
  }, [loadClip])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.classList.toggle("dark", theme === "dark")
    localStorage.setItem("osbe-markdown-clipper-theme", theme)
  }, [theme])

  const copyMarkdown = async () => {
    if (!markdown) {
      return
    }

    setStatus("busy")
    setMessage("Copying Markdown...")

    try {
      await navigator.clipboard.writeText(markdown)
      setStatus("done")
      setMessage("Copied Markdown.")
    } catch {
      if (!activeTabId) {
        setStatus("error")
        setMessage("Chrome rejected the clipboard write.")
        return
      }

      try {
        await copyMarkdownToTab(activeTabId, markdown)
        setStatus("done")
        setMessage("Copied Markdown.")
      } catch (error) {
        setStatus("error")
        setMessage(
          error instanceof Error
            ? error.message
            : "Chrome rejected the clipboard write."
        )
      }
    }
  }

  const downloadMarkdown = async () => {
    if (!clip) {
      return
    }

    setStatus("busy")
    setMessage("Preparing the download...")

    try {
      const downloadResponse = await chrome.runtime.sendMessage<
        { type: typeof DOWNLOAD_MESSAGE; payload: ClipPayload },
        ExtensionResponse<{ filename: string }>
      >({
        type: DOWNLOAD_MESSAGE,
        payload: { ...clip, title, markdown }
      })

      if (!downloadResponse) {
        throw new Error("The download could not be created.")
      }

      if (downloadResponse.ok === false) {
        throw new Error(downloadResponse.error)
      }

      setStatus("done")
      setMessage(`Downloaded ${downloadResponse.data.filename}.`)
    } catch (error) {
      setStatus("error")
      setMessage(
        error instanceof Error
          ? error.message
          : "The download could not be created."
      )
    }
  }

  return (
    <div className="clipper-shell" data-theme={theme}>
      <main className="clipper-frame">
        <header className="clipper-header">
          <div className="clipper-brand">
            <img
              alt=""
              aria-hidden="true"
              className="clipper-icon-frame block dark:hidden"
              src={lightLogoUrl}
            />
            <img
              alt=""
              aria-hidden="true"
              className="clipper-icon-frame hidden dark:block"
              src={lightLogoUrl}
            />
            <h1 className="clipper-title">Markdown Clipper</h1>
          </div>

          <div className="clipper-toolbar" aria-label="Popup tools">
            <IconButton
              label={
                theme === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
              onClick={() =>
                setTheme((current) => (current === "dark" ? "light" : "dark"))
              }>
              {theme === "dark" ? <Sun /> : <Moon />}
            </IconButton>
            <IconButton label="Refresh clip" onClick={loadClip}>
              <RefreshCw />
            </IconButton>
          </div>
        </header>

        <section className="clipper-switch-row" aria-label="Clip options">
          <SwitchControl
            checked={includeImages}
            icon={<Image />}
            label="Images"
            onChange={setIncludeImages}
          />
          <SwitchControl
            checked={includeTemplate}
            icon={<FileText />}
            label="Template"
            onChange={setIncludeTemplate}
          />
        </section>

        <section className="clipper-field">
          <label className="clipper-label" htmlFor="clipper-title">
            Title
          </label>
          <input
            className="clipper-title-input"
            id="clipper-title"
            onChange={(event) => setTitle(event.currentTarget.value)}
            placeholder="Document title..."
            value={title}
          />
        </section>

        <section className="clipper-markdown-panel">
          <div className="clipper-panel-header">
            <span className="clipper-label">Markdown</span>
            <div className="clipper-panel-actions">
              <span className="clipper-count">
                {markdown.length.toLocaleString()} chars
              </span>
              <button
                aria-label={
                  previewVisible ? "Show Markdown" : "Preview rich text"
                }
                className="clipper-view-toggle"
                onClick={() => setPreviewVisible((current) => !current)}
                title={previewVisible ? "Show Markdown" : "Preview rich text"}
                type="button">
                {previewVisible ? <EyeOff /> : <Eye />}
                <span>{previewVisible ? "Markdown" : "Preview"}</span>
              </button>
              <Button
                className="clipper-copy-button"
                disabled={!markdown || status === "busy"}
                onClick={copyMarkdown}
                type="button"
                variant="outline">
                <Clipboard className="h-4 w-4" />
                Copy
              </Button>
            </div>
          </div>

          <div className="clipper-markdown-body">
            {status === "error" ? (
              <ErrorPane message={message} />
            ) : previewVisible ? (
              <MarkdownPreview blocks={previewBlocks} />
            ) : (
              <textarea
                aria-label="Markdown output"
                className="clipper-markdown-output"
                readOnly
                value={
                  status === "busy" && !markdown
                    ? "Reading the current page..."
                    : markdown
                }
              />
            )}
          </div>
        </section>

        <Button
          className="clipper-primary-action"
          disabled={!clip || status === "busy"}
          onClick={downloadMarkdown}>
          {status === "busy" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Download
        </Button>

        <div className="clipper-status" data-state={status} role="status">
          {status === "done" ? (
            <CheckCircle2 className="clipper-status-icon" />
          ) : status === "error" ? (
            <AlertTriangle className="clipper-status-icon" />
          ) : status === "busy" ? (
            <Loader2 className="clipper-status-icon animate-spin" />
          ) : null}
          <span>{message}</span>
        </div>
      </main>
    </div>
  )
}

function preferredTheme(): Theme {
  const stored = localStorage.getItem("osbe-markdown-clipper-theme")

  if (stored === "dark" || stored === "light") {
    return stored
  }

  return window.matchMedia?.("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark"
}

function SwitchControl({
  checked,
  icon,
  label,
  onChange
}: {
  checked: boolean
  icon: ReactNode
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="clipper-switch-control">
      <span className="clipper-switch-label">
        {icon}
        {label}
      </span>
      <input
        checked={checked}
        className="clipper-switch-input"
        onChange={(event) => onChange(event.currentTarget.checked)}
        type="checkbox"
      />
      <span className="clipper-switch-track" aria-hidden="true">
        <span className="clipper-switch-thumb" />
      </span>
    </label>
  )
}

function IconButton({
  children,
  label,
  onClick
}: {
  children: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      aria-label={label}
      className="clipper-icon-button"
      onClick={onClick}
      title={label}
      type="button">
      {children}
    </button>
  )
}

function ErrorPane({ message }: { message: string }) {
  return (
    <div className="clipper-error-pane">
      <strong>Error clipping the page</strong>
      <p>{message}</p>
    </div>
  )
}

type PreviewBlock =
  | { type: "blockquote"; text: string }
  | { type: "code"; text: string }
  | { type: "heading"; depth: number; text: string }
  | { type: "image"; alt: string; src: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "paragraph"; text: string }

function MarkdownPreview({ blocks }: { blocks: PreviewBlock[] }) {
  if (blocks.length === 0) {
    return <div className="clipper-preview-empty">No preview available.</div>
  }

  return (
    <div className="clipper-preview" aria-label="Rich text preview">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "heading": {
            const Heading = `h${Math.min(block.depth, 4)}` as
              | "h1"
              | "h2"
              | "h3"
              | "h4"

            return <Heading key={index}>{block.text}</Heading>
          }
          case "blockquote":
            return <blockquote key={index}>{block.text}</blockquote>
          case "code":
            return <pre key={index}>{block.text}</pre>
          case "image":
            return (
              <figure key={index}>
                <div className="clipper-preview-image">
                  <Image />
                  <span>{block.alt || block.src}</span>
                </div>
              </figure>
            )
          case "list":
            return block.ordered ? (
              <ol key={index}>
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{item}</li>
                ))}
              </ol>
            ) : (
              <ul key={index}>
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{item}</li>
                ))}
              </ul>
            )
          default:
            return <p key={index}>{block.text}</p>
        }
      })}
    </div>
  )
}

function markdownPreviewBlocks(markdown: string): PreviewBlock[] {
  const body = stripFrontmatter(markdown)
  const lines = body.split("\n")
  const blocks: PreviewBlock[] = []

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const trimmed = line.trim()

    if (!trimmed) {
      continue
    }

    if (trimmed.startsWith("```")) {
      const codeLines: string[] = []
      index += 1

      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        codeLines.push(lines[index])
        index += 1
      }

      blocks.push({ type: "code", text: codeLines.join("\n") })
      continue
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/)

    if (heading) {
      blocks.push({
        type: "heading",
        depth: heading[1].length,
        text: plainInlineText(heading[2])
      })
      continue
    }

    const image = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)

    if (image) {
      blocks.push({ type: "image", alt: image[1], src: image[2] })
      continue
    }

    if (trimmed.startsWith(">")) {
      blocks.push({
        type: "blockquote",
        text: plainInlineText(trimmed.replace(/^>\s?/, ""))
      })
      continue
    }

    const unorderedItem = trimmed.match(/^[-*]\s+(.+)$/)
    const orderedItem = trimmed.match(/^\d+\.\s+(.+)$/)

    if (unorderedItem || orderedItem) {
      const ordered = Boolean(orderedItem)
      const items = [plainInlineText((unorderedItem || orderedItem)![1])]

      while (index + 1 < lines.length) {
        const next = lines[index + 1].trim()
        const nextMatch = ordered
          ? next.match(/^\d+\.\s+(.+)$/)
          : next.match(/^[-*]\s+(.+)$/)

        if (!nextMatch) {
          break
        }

        items.push(plainInlineText(nextMatch[1]))
        index += 1
      }

      blocks.push({ type: "list", ordered, items })
      continue
    }

    const paragraphLines = [trimmed]

    while (index + 1 < lines.length) {
      const next = lines[index + 1].trim()

      if (
        !next ||
        next.startsWith("#") ||
        next.startsWith(">") ||
        next.startsWith("```") ||
        /^[-*]\s+/.test(next) ||
        /^\d+\.\s+/.test(next)
      ) {
        break
      }

      paragraphLines.push(next)
      index += 1
    }

    blocks.push({
      type: "paragraph",
      text: plainInlineText(paragraphLines.join(" "))
    })
  }

  return blocks
}

function stripFrontmatter(markdown: string) {
  return markdown.replace(/^---\n[\s\S]*?\n---\n*/, "")
}

function markdownWithTitle(markdown: string, title: string) {
  if (!markdown.startsWith("---\n")) {
    return markdown
  }

  const frontmatterEnd = markdown.indexOf("\n---", 4)

  if (frontmatterEnd === -1) {
    return markdown
  }

  const frontmatter = markdown.slice(0, frontmatterEnd)
  const rest = markdown.slice(frontmatterEnd)
  const nextTitle = `title: ${JSON.stringify(title || "Untitled page")}`

  if (/^title: .+$/m.test(frontmatter)) {
    return `${frontmatter.replace(/^title: .+$/m, nextTitle)}${rest}`
  }

  return `${frontmatter}\n${nextTitle}${rest}`
}

function plainInlineText(value: string) {
  return value
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/([*_~`])/g, "")
}

export default IndexPopup
