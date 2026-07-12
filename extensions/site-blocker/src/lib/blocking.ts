import {
  clearExpiredOverrides,
  createDnrUrlFilter,
  createSampleUrlForDomain,
  domainSpecificity,
  isRuleBlocking
} from "./matcher"
import { readState, writeState } from "./storage"
import type {
  AppState,
  BlockingRulesMatchTest,
  BlockingRulesStatus
} from "./types"

const DYNAMIC_RULE_ID_OFFSET = 24000
const BLOCKED_EXTENSION_PATH = "/tabs/blocked.html"

const MAIN_FRAME_RESOURCE_TYPES: chrome.declarativeNetRequest.ResourceType[] = [
  chrome.declarativeNetRequest.ResourceType.MAIN_FRAME
]

export async function refreshDynamicBlockingRules(): Promise<BlockingRulesStatus> {
  if (
    typeof chrome === "undefined" ||
    !chrome.declarativeNetRequest?.getDynamicRules
  ) {
    return {
      dynamicRuleCount: 0,
      dynamicRules: []
    }
  }

  const state = await readState()
  const cleanedState = await clearExpiredState(state)
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules()
  const removeRuleIds = existingRules
    .filter((rule) => rule.id >= DYNAMIC_RULE_ID_OFFSET)
    .map((rule) => rule.id)

  const addRules = cleanedState.settings.paused
    ? []
    : cleanedState.rules.map<chrome.declarativeNetRequest.Rule>(
        (rule, index) => ({
          id: DYNAMIC_RULE_ID_OFFSET + index + 1,
          priority: domainSpecificity(rule.domain),
          action: isRuleBlocking(rule)
            ? {
                type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
                redirect: {
                  extensionPath: `${BLOCKED_EXTENSION_PATH}?rule=${encodeURIComponent(rule.id)}`
                }
              }
            : {
                type: chrome.declarativeNetRequest.RuleActionType.ALLOW
              },
          condition: {
            urlFilter: createDnrUrlFilter(rule.domain),
            resourceTypes: MAIN_FRAME_RESOURCE_TYPES
          }
        })
      )

  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules,
    removeRuleIds
  })

  return getInstalledBlockingRulesStatus(cleanedState)
}

export async function getInstalledBlockingRulesStatus(
  state?: AppState
): Promise<BlockingRulesStatus> {
  if (
    typeof chrome === "undefined" ||
    !chrome.declarativeNetRequest?.getDynamicRules
  ) {
    return {
      dynamicRuleCount: 0,
      dynamicRules: []
    }
  }

  const dynamicRules = await chrome.declarativeNetRequest.getDynamicRules()
  const blockingRules = dynamicRules
    .filter(
      (rule) =>
        rule.id >= DYNAMIC_RULE_ID_OFFSET &&
        rule.action.type ===
          chrome.declarativeNetRequest.RuleActionType.REDIRECT
    )
    .map((rule) => ({
      id: rule.id,
      regexFilter: rule.condition.regexFilter,
      urlFilter: rule.condition.urlFilter
    }))
  const currentState = state || (await readState())
  const matchTest = await testFirstBlockingRule(currentState)

  return {
    dynamicRuleCount: blockingRules.length,
    dynamicRules: blockingRules,
    matchTest
  }
}

export async function clearExpiredState(state?: AppState) {
  const currentState = state || (await readState())
  const result = clearExpiredOverrides(currentState.rules)

  if (!result.changed) {
    return currentState
  }

  const nextState = {
    ...currentState,
    rules: result.rules
  }

  await writeState(nextState)
  return nextState
}

async function testFirstBlockingRule(
  state: AppState
): Promise<BlockingRulesMatchTest | undefined> {
  if (state.settings.paused) {
    return undefined
  }

  const firstBlockingRule = state.rules.find((rule) => isRuleBlocking(rule))

  if (!firstBlockingRule) {
    return undefined
  }

  const url = createSampleUrlForDomain(firstBlockingRule.domain)
  const dnr =
    chrome.declarativeNetRequest as typeof chrome.declarativeNetRequest & {
      testMatchOutcome?: (request: {
        url: string
        type: chrome.declarativeNetRequest.ResourceType
      }) => Promise<{
        matchedRules: chrome.declarativeNetRequest.MatchedRule[]
      }>
    }

  if (!dnr.testMatchOutcome) {
    return {
      url,
      matchedRuleIds: [],
      supported: false
    }
  }

  try {
    const result = await dnr.testMatchOutcome({
      url,
      type: chrome.declarativeNetRequest.ResourceType.MAIN_FRAME
    })

    return {
      url,
      matchedRuleIds: result.matchedRules
        .map((match) => match.ruleId)
        .filter((ruleId) => ruleId >= DYNAMIC_RULE_ID_OFFSET),
      supported: true
    }
  } catch (error) {
    return {
      url,
      matchedRuleIds: [],
      supported: true,
      error:
        error instanceof Error
          ? error.message
          : "Chrome could not test the installed rule match."
    }
  }
}
