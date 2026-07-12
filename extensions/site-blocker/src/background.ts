import {
  clearExpiredState,
  getInstalledBlockingRulesStatus,
  refreshDynamicBlockingRules
} from "./lib/blocking"
import { createNavigationEnforcer } from "./lib/navigation"
import { readState } from "./lib/storage"
import {
  GET_BLOCKING_RULES_STATUS_MESSAGE,
  OPEN_DASHBOARD_MESSAGE,
  REFRESH_BLOCKING_RULES_MESSAGE
} from "./lib/types"

const enforceNavigation = createNavigationEnforcer({
  getBlockedPageUrl: (ruleId) =>
    chrome.runtime.getURL(
      `tabs/blocked.html?rule=${encodeURIComponent(ruleId)}`
    ),
  readState,
  updateTab: async (tabId, url) => {
    await chrome.tabs.update(tabId, { url })
  }
})

function enforceNavigationInBackground(
  target: Parameters<typeof enforceNavigation>[0]
) {
  enforceNavigation(target).catch((error) => {
    console.error("OSBE Site Blocker navigation enforcement failed", error)
  })
}

async function enforceOpenBlockedTabs() {
  const tabs = await chrome.tabs.query({
    url: ["http://*/*", "https://*/*"]
  })

  await Promise.all(
    tabs.flatMap((tab) =>
      typeof tab.id === "number" && tab.url
        ? [
            enforceNavigation({
              frameId: 0,
              tabId: tab.id,
              url: tab.url
            })
          ]
        : []
    )
  )
}

async function refreshAndEnforceBlockingRules() {
  const status = await refreshDynamicBlockingRules()
  await enforceOpenBlockedTabs()
  return status
}

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  enforceNavigationInBackground(details)
})

chrome.webNavigation.onCommitted.addListener((details) => {
  enforceNavigationInBackground(details)
})

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  enforceNavigationInBackground(details)
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const url =
    changeInfo.url || (changeInfo.status === "loading" ? tab.url : undefined)

  if (!url) {
    return
  }

  enforceNavigationInBackground({
    frameId: 0,
    tabId,
    url
  })
})

chrome.tabs.onReplaced.addListener((addedTabId) => {
  chrome.tabs
    .get(addedTabId)
    .then((tab) => {
      if (tab.url) {
        enforceNavigationInBackground({
          frameId: 0,
          tabId: addedTabId,
          url: tab.url
        })
      }
    })
    .catch((error) => {
      console.error("OSBE Site Blocker replaced-tab check failed", error)
    })
})

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("osbe-site-blocker-refresh", {
    periodInMinutes: 1
  })

  refreshAndEnforceBlockingRules().catch((error) => {
    console.error("OSBE Site Blocker install refresh failed", error)
  })
})

chrome.runtime.onStartup.addListener(() => {
  refreshAndEnforceBlockingRules().catch((error) => {
    console.error("OSBE Site Blocker startup refresh failed", error)
  })
})

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== "osbe-site-blocker-refresh") {
    return
  }

  clearExpiredState()
    .then(() => refreshAndEnforceBlockingRules())
    .catch((error) => {
      console.error("OSBE Site Blocker alarm refresh failed", error)
    })
})

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes["osbe-site-blocker-state"]) {
    return
  }

  refreshAndEnforceBlockingRules().catch((error) => {
    console.error("OSBE Site Blocker storage refresh failed", error)
  })
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === OPEN_DASHBOARD_MESSAGE) {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage()
    } else {
      chrome.tabs.create({ url: chrome.runtime.getURL("options.html") })
    }
    sendResponse({ ok: true })
    return false
  }

  if (message?.type === REFRESH_BLOCKING_RULES_MESSAGE) {
    refreshAndEnforceBlockingRules()
      .then((status) => sendResponse({ ok: true, data: status }))
      .catch((error) => {
        console.error("OSBE Site Blocker manual refresh failed", error)
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Refresh failed"
        })
      })

    return true
  }

  if (message?.type === GET_BLOCKING_RULES_STATUS_MESSAGE) {
    getInstalledBlockingRulesStatus()
      .then((status) => sendResponse({ ok: true, data: status }))
      .catch((error) => {
        console.error("OSBE Site Blocker status check failed", error)
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Status check failed"
        })
      })

    return true
  }

  return false
})
