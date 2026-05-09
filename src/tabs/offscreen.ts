import JSZip from "jszip"

import {
  OFFSCREEN_DOWNLOAD_MESSAGE,
  OFFSCREEN_REVOKE_MESSAGE,
  type ClipPayload,
  type ExtensionResponse,
  type OffscreenDownloadRequest
} from "~lib/clip-types"

type OffscreenMessage =
  | OffscreenDownloadRequest
  | { type: string; url?: string }

chrome.runtime.onMessage.addListener(
  (message: OffscreenMessage, _sender, sendResponse) => {
    if (message?.type === OFFSCREEN_REVOKE_MESSAGE && message.url) {
      setTimeout(() => URL.revokeObjectURL(message.url), 60_000)
      return false
    }

    if (!isOffscreenDownloadRequest(message)) {
      return false
    }

    createDownloadUrl(message.payload)
      .then((download) => {
        const response: ExtensionResponse<{ url: string; filename: string }> = {
          ok: true,
          data: download
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

function isOffscreenDownloadRequest(message: OffscreenMessage): message is OffscreenDownloadRequest {
  return message?.type === OFFSCREEN_DOWNLOAD_MESSAGE && "payload" in message
}

async function createDownloadUrl(payload: ClipPayload) {
  const basename = slugify(payload.title || "markdown-clip")

  if (payload.includeImages && payload.images.length > 0) {
    const zip = new JSZip()
    const failures: string[] = []

    zip.file(`${basename}.md`, payload.markdown)

    await Promise.all(
      payload.images.map(async (image) => {
        try {
          const blob = await fetchImage(image.url)
          zip.file(image.filename, blob)
        } catch (error) {
          failures.push(`${image.filename}: ${image.url}`)
          console.warn("Markdown Clipper image download failed", error)
        }
      })
    )

    if (failures.length > 0) {
      zip.file("assets/image-download-errors.txt", failures.join("\n"))
    }

    const blob = await zip.generateAsync({ type: "blob" })

    return {
      url: URL.createObjectURL(blob),
      filename: `${basename}.zip`
    }
  }

  const blob = new Blob([payload.markdown], {
    type: "text/markdown;charset=utf-8"
  })

  return {
    url: URL.createObjectURL(blob),
    filename: `${basename}.md`
  }
}

async function fetchImage(url: string) {
  if (url.startsWith("data:")) {
    return dataUrlToBlob(url)
  }

  const response = await fetch(url, {
    credentials: "include",
    cache: "force-cache"
  })

  if (!response.ok) {
    throw new Error(`Could not download image: ${url}`)
  }

  return response.blob()
}

function dataUrlToBlob(dataUrl: string) {
  const [metadata, data] = dataUrl.split(",", 2)
  const mimeType = metadata.match(/^data:([^;]+)/)?.[1] || "application/octet-stream"
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return new Blob([bytes], { type: mimeType })
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)

  return slug || "markdown-clip"
}
