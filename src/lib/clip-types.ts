export const DOWNLOAD_MESSAGE = "osbe/markdown-clipper:download"
export const OFFSCREEN_DOWNLOAD_MESSAGE = "osbe/markdown-clipper:offscreen-download"
export const OFFSCREEN_REVOKE_MESSAGE = "osbe/markdown-clipper:offscreen-revoke"

export type ClipMode = "page" | "selection"

export type ClipImage = {
  url: string
  filename: string
  alt?: string
}

export type ClipPayload = {
  title: string
  sourceUrl: string
  markdown: string
  images: ClipImage[]
  includeImages: boolean
  createdAt: string
}

export type DownloadRequest = {
  type: typeof DOWNLOAD_MESSAGE
  payload: ClipPayload
}

export type OffscreenDownloadRequest = {
  type: typeof OFFSCREEN_DOWNLOAD_MESSAGE
  payload: ClipPayload
}

export type ExtensionResponse<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string }
