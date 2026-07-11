import { getDomain } from "tldts"

import type { AppState, BlockRule, RuleMatch } from "./types"

export function normalizeDomain(input: string) {
  const value = input.trim().toLowerCase()

  if (!value) {
    return ""
  }

  try {
    const url = new URL(
      /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`
    )

    return url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "")
  } catch {
    return value
      .replace(/^[a-z][a-z0-9+.-]*:\/\//i, "")
      .split(/[/?#]/, 1)[0]
      .split(":", 1)[0]
      .replace(/\.$/, "")
  }
}

export function validateDomain(input: string) {
  const domain = normalizeDomain(input)

  if (!domain) {
    return "Enter a website."
  }

  if (domain.length > 253 || !domain.includes(".")) {
    return "Enter a complete website such as x.com."
  }

  const labels = domain.split(".")

  if (
    labels.some(
      (label) =>
        !label ||
        label.length > 63 ||
        !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
    )
  ) {
    return "Enter a valid website such as x.com or mail.x.com."
  }

  if (!getDomain(domain, { allowPrivateDomains: true })) {
    return "Enter a specific website rather than a shared domain suffix."
  }

  return null
}

export function findMatchingRule(
  state: AppState,
  url: string,
  now = Date.now()
): RuleMatch | null {
  if (state.settings.paused) {
    return null
  }

  const match = state.rules
    .filter((rule) => ruleDomainMatchesUrl(rule, url))
    .sort(compareRuleSpecificity)[0]

  if (!match) {
    return null
  }

  if (!match.enabled) {
    return { rule: match, reason: "disabled" }
  }

  if (isRuleOverridden(match, now)) {
    return { rule: match, reason: "overridden" }
  }

  return { rule: match, reason: "blocked" }
}

export function isRuleBlocking(rule: BlockRule, now = Date.now()) {
  return rule.enabled && !isRuleOverridden(rule, now)
}

export function isRuleOverridden(rule: BlockRule, now = Date.now()) {
  return typeof rule.overrideUntil === "number" && rule.overrideUntil > now
}

export function clearExpiredOverrides(rules: BlockRule[], now = Date.now()) {
  let changed = false
  const nextRules = rules.map((rule) => {
    if (rule.overrideUntil && rule.overrideUntil <= now) {
      changed = true
      const { overrideUntil: _overrideUntil, ...nextRule } = rule
      return nextRule
    }

    return rule
  })

  return { changed, rules: nextRules }
}

export function ruleDomainMatchesUrl(rule: BlockRule, urlValue: string) {
  let url: URL

  try {
    url = new URL(urlValue)
  } catch {
    return false
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    return false
  }

  const host = url.hostname.toLowerCase().replace(/\.$/, "")
  const domain = normalizeDomain(rule.domain)

  return host === domain || host.endsWith(`.${domain}`)
}

export function createDnrRegexFilter(domainValue: string) {
  const domain = normalizeDomain(domainValue)
  const hostRegex = `(?:[^/]+\\.)?${escapeRegex(domain)}`

  return `^https?://${hostRegex}(?::[0-9]+)?(?:[/?#].*)?$`
}

export function createSampleUrlForDomain(domain: string) {
  return `https://${normalizeDomain(domain)}/`
}

export function domainSpecificity(domain: string) {
  return normalizeDomain(domain).split(".").length
}

function compareRuleSpecificity(left: BlockRule, right: BlockRule) {
  return (
    domainSpecificity(right.domain) - domainSpecificity(left.domain) ||
    right.domain.length - left.domain.length ||
    right.createdAt - left.createdAt
  )
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
