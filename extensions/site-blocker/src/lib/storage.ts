import { normalizeDomain, validateDomain } from "./matcher"
import {
  DEFAULT_STATE,
  REFRESH_BLOCKING_RULES_MESSAGE,
  type AppState,
  type BlockingRulesStatus,
  type BlockRule,
  type ExtensionMessageResponse
} from "./types"

const STORAGE_KEY = "osbe-site-blocker-state"
const FALLBACK_STORAGE_KEY = "osbe-site-blocker-dev-state"

export async function readState(): Promise<AppState> {
  if (hasChromeStorage()) {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    return normalizeState(result[STORAGE_KEY])
  }

  const stored = localStorage.getItem(FALLBACK_STORAGE_KEY)
  return normalizeState(stored ? JSON.parse(stored) : null)
}

export async function writeState(state: AppState) {
  const nextState = normalizeState(state)

  if (hasChromeStorage()) {
    await chrome.storage.local.set({ [STORAGE_KEY]: nextState })
    await refreshBlockingRules()
    return
  }

  localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(nextState))
  window.dispatchEvent(new CustomEvent("osbe-site-blocker-state-changed"))
}

export function subscribeToStateChanges(callback: () => void) {
  if (hasChromeStorage()) {
    const listener = (
      changes: Record<string, chrome.storage.StorageChange>
    ) => {
      if (changes[STORAGE_KEY]) {
        callback()
      }
    }

    const storageChanged = chrome.storage.onChanged

    if (!storageChanged) {
      return () => {}
    }

    try {
      storageChanged.addListener(listener)
    } catch {
      // A blocked tab can outlive an extension update or reload.
      return () => {}
    }

    return () => {
      try {
        storageChanged.removeListener(listener)
      } catch {
        // The extension context may have been invalidated after subscribing.
      }
    }
  }

  const listener = () => callback()
  window.addEventListener("osbe-site-blocker-state-changed", listener)
  return () =>
    window.removeEventListener("osbe-site-blocker-state-changed", listener)
}

export async function refreshBlockingRules() {
  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
    return null
  }

  try {
    const response = await chrome.runtime.sendMessage<
      { type: typeof REFRESH_BLOCKING_RULES_MESSAGE },
      ExtensionMessageResponse<BlockingRulesStatus>
    >({ type: REFRESH_BLOCKING_RULES_MESSAGE })

    if (response?.ok === false) {
      throw new Error(response.error)
    }

    return response?.data || null
  } catch {
    // MV3 service workers may be asleep during local UI edits. Storage changes
    // and alarms still refresh rules when the worker wakes.
    return null
  }
}

function normalizeState(value: unknown): AppState {
  const candidate = typeof value === "object" && value ? value : {}
  const state = candidate as {
    settings?: Partial<AppState["settings"]>
    rules?: unknown[]
  }
  const usedDomains = new Set<string>()
  const rules = Array.isArray(state.rules)
    ? state.rules.flatMap((value) => {
        if (typeof value !== "object" || !value) {
          return []
        }

        const rule = value as Partial<BlockRule> & { pattern?: unknown }

        const legacyPattern =
          typeof rule.pattern === "string" ? rule.pattern : ""
        const rawDomain =
          typeof rule.domain === "string" ? rule.domain : legacyPattern
        const domain = normalizeDomain(rawDomain)

        if (validateDomain(domain) || usedDomains.has(domain)) {
          return []
        }

        usedDomains.add(domain)

        return [
          {
            id:
              typeof rule.id === "string"
                ? rule.id
                : `rule-${Date.now()}-${usedDomains.size}`,
            domain,
            enabled: rule.enabled !== false,
            overrideUntil:
              typeof rule.overrideUntil === "number"
                ? rule.overrideUntil
                : undefined,
            createdAt:
              typeof rule.createdAt === "number" ? rule.createdAt : Date.now()
          }
        ]
      })
    : []

  return {
    settings: {
      ...DEFAULT_STATE.settings,
      ...(state.settings || {})
    },
    rules
  }
}

function hasChromeStorage() {
  return typeof chrome !== "undefined" && Boolean(chrome.storage?.local)
}
