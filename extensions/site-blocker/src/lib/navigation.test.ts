import assert from "node:assert/strict"
import test from "node:test"

import { createNavigationEnforcer } from "./navigation"
import type { AppState } from "./types"

const BLOCKED_X_STATE: AppState = {
  settings: { paused: false },
  rules: [
    {
      id: "x-rule",
      domain: "x.com",
      enabled: true,
      createdAt: 1
    }
  ]
}

test("redirects a blocked X navigation that escaped the network rule", async () => {
  const updates: Array<{ tabId: number; url: string }> = []
  const enforceNavigation = createNavigationEnforcer({
    getBlockedPageUrl: (ruleId) =>
      `chrome-extension://site-blocker/tabs/blocked.html?rule=${ruleId}`,
    readState: async () => BLOCKED_X_STATE,
    updateTab: async (tabId, url) => {
      updates.push({ tabId, url })
    }
  })

  const redirected = await enforceNavigation({
    frameId: 0,
    tabId: 42,
    url: "https://x.com/Trumperizar/status/2075779047217406299"
  })

  assert.equal(redirected, true)
  assert.deepEqual(updates, [
    {
      tabId: 42,
      url: "chrome-extension://site-blocker/tabs/blocked.html?rule=x-rule"
    }
  ])
})

test("ignores subframes and non-blocking rule states", async () => {
  const updates: Array<{ tabId: number; url: string }> = []
  const enforceNavigation = createNavigationEnforcer({
    getBlockedPageUrl: (ruleId) => `blocked:${ruleId}`,
    readState: async () => ({
      ...BLOCKED_X_STATE,
      settings: { paused: true }
    }),
    updateTab: async (tabId, url) => {
      updates.push({ tabId, url })
    }
  })

  assert.equal(
    await enforceNavigation({
      frameId: 3,
      tabId: 42,
      url: "https://x.com/home"
    }),
    false
  )
  assert.equal(
    await enforceNavigation({
      frameId: 0,
      tabId: 42,
      url: "https://x.com/home"
    }),
    false
  )
  assert.deepEqual(updates, [])
})
