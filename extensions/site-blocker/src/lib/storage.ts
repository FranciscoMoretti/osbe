import { sendExtensionRequest } from "@osbe/extension-kit/messaging"
import {
  createBrowserStorageAdapter,
  createStoredState
} from "@osbe/extension-kit/storage"

import { normalizeDomain, validateDomain } from "./matcher"
import {
  DEFAULT_STATE,
  REFRESH_BLOCKING_RULES_MESSAGE,
  type AppState,
  type BlockingRulesStatus,
  type BlockRule
} from "./types"

const STORAGE_KEY = "osbe-site-blocker-state"
const FALLBACK_STORAGE_KEY = "osbe-site-blocker-dev-state"
const stateStore = createStoredState({
  adapter: createBrowserStorageAdapter({
    fallbackEventName: "osbe-site-blocker-state-changed",
    fallbackKey: FALLBACK_STORAGE_KEY
  }),
  defaults: DEFAULT_STATE,
  key: STORAGE_KEY,
  normalize: normalizeState
})

export async function readState(): Promise<AppState> {
  return stateStore.read()
}

export async function writeState(state: AppState) {
  const nextState = await stateStore.write(state)

  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    await refreshBlockingRules()
  }

  return nextState
}

export function subscribeToStateChanges(callback: () => void) {
  return stateStore.subscribe(callback)
}

export async function refreshBlockingRules() {
  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
    return null
  }

  try {
    return await sendExtensionRequest<
      { type: typeof REFRESH_BLOCKING_RULES_MESSAGE },
      BlockingRulesStatus
    >({ type: REFRESH_BLOCKING_RULES_MESSAGE })
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
