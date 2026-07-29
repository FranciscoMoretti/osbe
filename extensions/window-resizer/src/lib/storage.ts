import { createStoredState } from "@osbe/extension-kit/storage"

import {
  createDefaultState,
  normalizePresetState,
  type PresetState
} from "./presets"

const presetStore = createStoredState<PresetState>({
  defaults: createDefaultState(),
  key: "window-resizer-presets",
  normalize: normalizePresetState
})

export const readPresetState = presetStore.read
export const writePresetState = presetStore.write
export const subscribeToPresetChanges = presetStore.subscribe
