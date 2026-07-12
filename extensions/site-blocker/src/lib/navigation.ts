import { findMatchingRule } from "./matcher"
import type { AppState } from "./types"

export type NavigationTarget = {
  frameId: number
  tabId: number
  url: string
}

type NavigationEnforcerDependencies = {
  getBlockedPageUrl: (ruleId: string) => string
  readState: () => Promise<AppState>
  updateTab: (tabId: number, url: string) => Promise<void>
}

export function createNavigationEnforcer({
  getBlockedPageUrl,
  readState,
  updateTab
}: NavigationEnforcerDependencies) {
  return async function enforceNavigation({
    frameId,
    tabId,
    url
  }: NavigationTarget) {
    if (frameId !== 0 || tabId < 0) {
      return false
    }

    const match = findMatchingRule(await readState(), url)

    if (!match || match.reason !== "blocked") {
      return false
    }

    await updateTab(tabId, getBlockedPageUrl(match.rule.id))
    return true
  }
}
