import { createStoredState } from "@osbe/extension-kit/storage"

export type ClipOptions = {
  includeImages: boolean
  includeTemplate: boolean
}

export const DEFAULT_CLIP_OPTIONS: ClipOptions = {
  includeImages: true,
  includeTemplate: true
}

const CLIP_OPTIONS_STORAGE_KEY = "osbe-markdown-clipper-options"
const clipOptionsStore = createStoredState({
  defaults: DEFAULT_CLIP_OPTIONS,
  key: CLIP_OPTIONS_STORAGE_KEY,
  normalize: normalizeClipOptions
})

export async function getStoredClipOptions() {
  return clipOptionsStore.read()
}

export async function saveStoredClipOptions(options: ClipOptions) {
  await clipOptionsStore.write(options)
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}
