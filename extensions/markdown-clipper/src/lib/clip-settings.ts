export type ClipOptions = {
  includeImages: boolean
  includeTemplate: boolean
}

export const DEFAULT_CLIP_OPTIONS: ClipOptions = {
  includeImages: true,
  includeTemplate: true
}

const CLIP_OPTIONS_STORAGE_KEY = "osbe-markdown-clipper-options"

export async function getStoredClipOptions() {
  const result = await getStorageValue(CLIP_OPTIONS_STORAGE_KEY)

  return normalizeClipOptions(result)
}

export async function saveStoredClipOptions(options: ClipOptions) {
  await setStorageValue(CLIP_OPTIONS_STORAGE_KEY, normalizeClipOptions(options))
}

function normalizeClipOptions(value: unknown): ClipOptions {
  if (!isRecord(value)) {
    return DEFAULT_CLIP_OPTIONS
  }

  return {
    includeImages:
      typeof value.includeImages === "boolean"
        ? value.includeImages
        : DEFAULT_CLIP_OPTIONS.includeImages,
    includeTemplate:
      typeof value.includeTemplate === "boolean"
        ? value.includeTemplate
        : DEFAULT_CLIP_OPTIONS.includeTemplate
  }
}

function getStorageValue(key: string) {
  return new Promise<unknown>((resolve) => {
    chrome.storage.local.get([key], (result) => {
      if (chrome.runtime.lastError) {
        resolve(undefined)
        return
      }

      resolve(result[key])
    })
  })
}

function setStorageValue(key: string, value: unknown) {
  return new Promise<void>((resolve, reject) => {
    chrome.storage.local.set({ [key]: value }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }

      resolve()
    })
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}
