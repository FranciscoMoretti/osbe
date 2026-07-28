import assert from "node:assert/strict"
import test from "node:test"

import {
  executeInTab,
  getActiveTab,
  ProtectedPageError,
  toUserFacingChromeError
} from "./tabs"

test("returns the active tab from an injected adapter", async () => {
  const tab = await getActiveTab({
    queryTabs: async () =>
      [
        {
          active: true,
          audible: false,
          autoDiscardable: true,
          discarded: false,
          groupId: -1,
          height: 800,
          highlighted: true,
          id: 42,
          incognito: false,
          index: 0,
          pinned: false,
          selected: true,
          status: "complete",
          title: "Example",
          width: 1280,
          windowId: 1
        }
      ] as chrome.tabs.Tab[]
  })

  assert.equal(tab.id, 42)
})

test("executes a function in the requested tab", async () => {
  const result = await executeInTab(
    42,
    (left: number, right: number) => left + right,
    [2, 3],
    {
      executeScript: async () => [{ result: 5 }]
    }
  )

  assert.equal(result, 5)
})

test("normalizes protected-page failures", () => {
  const error = toUserFacingChromeError(
    new Error("Cannot access contents of the page"),
    "Fallback"
  )

  assert.ok(error instanceof ProtectedPageError)
  assert.equal(
    error.message,
    "Chrome does not allow extensions to access this protected page. Try a regular website instead."
  )
})
