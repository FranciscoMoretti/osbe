export const CLIP_MESSAGE = "osbe/markdown-clipper:clip"
export const COPY_MARKDOWN_MESSAGE = "osbe/markdown-clipper:copy-markdown"
export const DOWNLOAD_MESSAGE = "osbe/markdown-clipper:download"
export const NOTICE_MESSAGE = "osbe/markdown-clipper:notice"
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

export type ClipRequest = {
  type: typeof CLIP_MESSAGE
  mode: ClipMode
  includeImages: boolean
}

export type DownloadRequest = {
  type: typeof DOWNLOAD_MESSAGE
  payload: ClipPayload
}

export type CopyMarkdownRequest = {
  type: typeof COPY_MARKDOWN_MESSAGE
  markdown: string
}

export type NoticeRequest = {
  type: typeof NOTICE_MESSAGE
  level: "success" | "error"
  message: string
}

export type OffscreenDownloadRequest = {
  type: typeof OFFSCREEN_DOWNLOAD_MESSAGE
  payload: ClipPayload
}

export type ExtensionResponse<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string }
