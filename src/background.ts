import {
  COPY_MARKDOWN_MESSAGE,
  DOWNLOAD_MESSAGE,
  NOTICE_MESSAGE,
  OFFSCREEN_DOWNLOAD_MESSAGE,
  OFFSCREEN_REVOKE_MESSAGE,
  type ClipPayload,
  type DownloadRequest,
  type ExtensionResponse
} from "~lib/clip-types"
import { requestClipFromTab } from "~lib/request-clip"

const DOWNLOAD_SELECTION_CONTEXT_MENU_ID = "markdown-clipper-download-selection"
const COPY_SELECTION_CONTEXT_MENU_ID = "markdown-clipper-copy-selection"
const OFFSCREEN_DOCUMENT_PATH = "tabs/offscreen.html"

let creatingOffscreenDocument: Promise<void> | null = null

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: DOWNLOAD_SELECTION_CONTEXT_MENU_ID,
      title: "Download as Markdown",
      contexts: ["selection"]
    })

    chrome.contextMenus.create({
      id: COPY_SELECTION_CONTEXT_MENU_ID,
      title: "Copy as Markdown",
      contexts: ["selection"]
    })
  })
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) {
    return
  }

  if (info.menuItemId === DOWNLOAD_SELECTION_CONTEXT_MENU_ID) {
    clipSelection(tab.id).catch((error) => {
      console.error("Markdown Clipper selection download failed", error)
    })
  }

  if (info.menuItemId === COPY_SELECTION_CONTEXT_MENU_ID) {
    copySelection(tab.id).catch((error) => {
      const message =
        error instanceof Error ? error.message : "Could not copy Markdown."

      console.error("Markdown Clipper selection copy failed", error)
      showNotice(tab.id!, `Could not copy Markdown: ${message}`, "error")
    })
  }
})

chrome.runtime.onMessage.addListener(
  (message: DownloadRequest, _sender, sendResponse) => {
    if (message?.type !== DOWNLOAD_MESSAGE) {
      return false
    }

    downloadClip(message.payload)
      .then((filename) => {
        const response: ExtensionResponse<{ filename: string }> = {
          ok: true,
          data: { filename }
        }

        sendResponse(response)
      })
      .catch((error) => {
        const response: ExtensionResponse = {
          ok: false,
          error: error instanceof Error ? error.message : "Download failed"
        }

        sendResponse(response)
      })

    return true
  }
)

async function clipSelection(tabId: number) {
  const clip = await requestClipFromTab(tabId, "selection", true)

  await downloadClip(clip)
}

async function copySelection(tabId: number) {
  const clip = await requestClipFromTab(tabId, "selection", false)

  await copyMarkdown(tabId, clip.markdown, clip.images.length)
}

async function copyMarkdown(tabId: number, markdown: string, imageCount = 0) {
  const response = await chrome.tabs.sendMessage<
    { type: typeof COPY_MARKDOWN_MESSAGE; markdown: string },
    ExtensionResponse<{ copied: true }>
  >(tabId, {
    type: COPY_MARKDOWN_MESSAGE,
    markdown
  })

  if (!response) {
    throw new Error("The page did not respond to the copy request.")
  }

  if (response.ok === false) {
    throw new Error(response.error)
  }

  await showNotice(
    tabId,
    imageCount > 0
      ? `Copied selection as Markdown with ${imageCount} image link${imageCount === 1 ? "" : "s"}.`
      : "Copied selection as Markdown.",
    "success"
  )
}

async function downloadClip(payload: ClipPayload) {
  await ensureOffscreenDocument()

  const response = await chrome.runtime.sendMessage<
    { type: typeof OFFSCREEN_DOWNLOAD_MESSAGE; payload: ClipPayload },
    ExtensionResponse<{ url: string; filename: string }>
  >({
    type: OFFSCREEN_DOWNLOAD_MESSAGE,
    payload
  })

  if (!response) {
    throw new Error("The download document did not respond.")
  }

  if (response.ok === false) {
    throw new Error(response.error)
  }

  await chrome.downloads.download({
    url: response.data.url,
    filename: response.data.filename,
    saveAs: true
  })

  chrome.runtime.sendMessage({
    type: OFFSCREEN_REVOKE_MESSAGE,
    url: response.data.url
  })

  return response.data.filename
}

async function ensureOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)
  const runtime = chrome.runtime as typeof chrome.runtime & {
    getContexts(query: unknown): Promise<unknown[]>
  }
  const offscreen = chrome.offscreen as {
    createDocument(options: unknown): Promise<void>
  }
  const existingContexts = await runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [offscreenUrl]
  })

  if (existingContexts.length > 0) {
    return
  }

  if (!creatingOffscreenDocument) {
    creatingOffscreenDocument = offscreen.createDocument({
      url: OFFSCREEN_DOCUMENT_PATH,
      reasons: ["BLOBS"],
      justification: "Create Blob URLs for Markdown and ZIP downloads."
    })
  }

  try {
    await creatingOffscreenDocument
  } finally {
    creatingOffscreenDocument = null
  }
}

async function showNotice(
  tabId: number,
  message: string,
  level: "success" | "error"
) {
  await chrome.tabs
    .sendMessage(tabId, {
      type: NOTICE_MESSAGE,
      level,
      message
    })
    .catch(() => undefined)
}
