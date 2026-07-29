export const MIN_WINDOW_SIZE = 320
export const MAX_WINDOW_SIZE = 7680

export type WindowPreset = {
  id: string
  name: string
  width: number
  height: number
}

export type PresetState = {
  version: 1
  presets: WindowPreset[]
}

export const DEFAULT_PRESETS: WindowPreset[] = [
  {
    id: "mobile",
    name: "Mobile",
    width: 375,
    height: 812
  },
  {
    id: "mobile-large",
    name: "Large mobile",
    width: 430,
    height: 932
  },
  {
    id: "tablet-portrait",
    name: "Tablet portrait",
    width: 768,
    height: 1024
  },
  {
    id: "tablet-landscape",
    name: "Tablet landscape",
    width: 1024,
    height: 768
  },
  {
    id: "laptop",
    name: "Laptop",
    width: 1440,
    height: 900
  },
  {
    id: "desktop",
    name: "Desktop",
    width: 1920,
    height: 1080
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
  presets: WindowPreset[],
  id: string,
  direction: -1 | 1
) {
  const currentIndex = presets.findIndex((preset) => preset.id === id)
  const nextIndex = currentIndex + direction

  if (
    currentIndex === -1 ||
    nextIndex < 0 ||
    nextIndex >= presets.length
  ) {
    return presets
  }

  const nextPresets = [...presets]
  const [preset] = nextPresets.splice(currentIndex, 1)
  nextPresets.splice(nextIndex, 0, preset)
  return nextPresets
}

export function restoreDefaultPresets(presets: WindowPreset[]) {
  const defaultIds = new Set(DEFAULT_PRESETS.map((preset) => preset.id))
  const customPresets = presets.filter((preset) => !defaultIds.has(preset.id))

  return [...cloneDefaultPresets(), ...customPresets]
}

export function isValidWindowSize(value: number) {
  return (
    Number.isInteger(value) &&
    value >= MIN_WINDOW_SIZE &&
    value <= MAX_WINDOW_SIZE
  )
}

function normalizePreset(value: unknown): WindowPreset | null {
  if (!isRecord(value)) return null

  const id = typeof value.id === "string" ? value.id.trim() : ""
  const name = typeof value.name === "string" ? value.name.trim() : ""
  const width = Number(value.width)
  const height = Number(value.height)

  if (
    !id ||
    !name ||
    name.length > 60 ||
    !isValidWindowSize(width) ||
    !isValidWindowSize(height)
  ) {
    return null
  }

  return { id, name, width, height }
}

function cloneDefaultPresets() {
  return DEFAULT_PRESETS.map((preset) => ({ ...preset }))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
