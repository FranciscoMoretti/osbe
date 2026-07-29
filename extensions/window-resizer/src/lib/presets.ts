export const MIN_RESIZE_SIZE = 320
export const MAX_RESIZE_SIZE = 7680

export type ResizeTarget = "viewport" | "window"

export type ResizePreset = {
  id: string
  name: string
  width: number
  height: number
  target: ResizeTarget
}

export type PresetState = {
  version: 1
  presets: ResizePreset[]
}

export const DEFAULT_PRESETS: ResizePreset[] = [
  {
    id: "mobile",
    name: "Mobile",
    width: 375,
    height: 812,
    target: "window"
  },
  {
    id: "mobile-large",
    name: "Large mobile",
    width: 430,
    height: 932,
    target: "window"
  },
  {
    id: "tablet-portrait",
    name: "Tablet portrait",
    width: 768,
    height: 1024,
    target: "window"
  },
  {
    id: "tablet-landscape",
    name: "Tablet landscape",
    width: 1024,
    height: 768,
    target: "window"
  },
  {
    id: "laptop",
    name: "Laptop",
    width: 1440,
    height: 900,
    target: "window"
  },
  {
    id: "desktop",
    name: "Desktop",
    width: 1920,
    height: 1080,
    target: "window"
  }
]

export const DEFAULT_STATE: PresetState = {
  version: 1,
  presets: cloneDefaultPresets()
}

export function normalizePresetState(value: unknown): PresetState {
  if (!isRecord(value) || !Array.isArray(value.presets)) {
    return createDefaultState()
  }

  const seenIds = new Set<string>()
  const presets = value.presets.flatMap((preset) => {
    const normalized = normalizePreset(preset)

    if (!normalized || seenIds.has(normalized.id)) return []

    seenIds.add(normalized.id)
    return [normalized]
  })

  return {
    version: 1,
    presets
  }
}

export function createDefaultState(): PresetState {
  return {
    version: 1,
    presets: cloneDefaultPresets()
  }
}

export function createPresetId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function movePreset(
  presets: ResizePreset[],
  id: string,
  direction: -1 | 1
) {
  const currentIndex = presets.findIndex((preset) => preset.id === id)
  const nextIndex = currentIndex + direction

  if (currentIndex === -1 || nextIndex < 0 || nextIndex >= presets.length) {
    return presets
  }

  const nextPresets = [...presets]
  const [preset] = nextPresets.splice(currentIndex, 1)
  nextPresets.splice(nextIndex, 0, preset)
  return nextPresets
}

export function restoreDefaultPresets(presets: ResizePreset[]) {
  const defaultIds = new Set(DEFAULT_PRESETS.map((preset) => preset.id))
  const customPresets = presets.filter((preset) => !defaultIds.has(preset.id))

  return [...cloneDefaultPresets(), ...customPresets]
}

export function isValidResizeSize(value: number) {
  return (
    Number.isInteger(value) &&
    value >= MIN_RESIZE_SIZE &&
    value <= MAX_RESIZE_SIZE
  )
}

function normalizePreset(value: unknown): ResizePreset | null {
  if (!isRecord(value)) return null

  const id = typeof value.id === "string" ? value.id.trim() : ""
  const name = typeof value.name === "string" ? value.name.trim() : ""
  const width = Number(value.width)
  const height = Number(value.height)
  const target = value.target === "viewport" ? "viewport" : "window"

  if (
    !id ||
    !name ||
    name.length > 60 ||
    !isValidResizeSize(width) ||
    !isValidResizeSize(height)
  ) {
    return null
  }

  return { id, name, width, height, target }
}

function cloneDefaultPresets() {
  return DEFAULT_PRESETS.map((preset) => ({ ...preset }))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
