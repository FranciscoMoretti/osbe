export type BlockRule = {
  id: string
  domain: string
  enabled: boolean
  overrideUntil?: number
  createdAt: number
}

export type Settings = {
  paused: boolean
}

export type AppState = {
  rules: BlockRule[]
  settings: Settings
}

export type RuleMatch = {
  rule: BlockRule
  reason: "blocked" | "disabled" | "overridden"
}

export type BlockingRulesStatus = {
  dynamicRuleCount: number
  dynamicRules: Array<{
    id: number
    regexFilter?: string
    urlFilter?: string
  }>
  matchTest?: BlockingRulesMatchTest
}

export type BlockingRulesMatchTest = {
  url: string
  matchedRuleIds: number[]
  supported: boolean
  error?: string
}

export type ExtensionMessageResponse<T = unknown> =
  | {
      ok: true
      data: T
    }
  | {
      ok: false
      error: string
    }

export const DEFAULT_SETTINGS: Settings = {
  paused: false
}

export const DEFAULT_STATE: AppState = {
  rules: [],
  settings: DEFAULT_SETTINGS
}

export const OPEN_DASHBOARD_MESSAGE = "osbe-site-blocker/open-dashboard"
export const REFRESH_BLOCKING_RULES_MESSAGE =
  "osbe-site-blocker/refresh-blocking-rules"
export const GET_BLOCKING_RULES_STATUS_MESSAGE =
  "osbe-site-blocker/get-blocking-rules-status"
