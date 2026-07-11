import {
  clearExpiredState,
  getInstalledBlockingRulesStatus,
  refreshDynamicBlockingRules
} from "./lib/blocking"
import { installOsbeVerificationHandler } from "./lib/osbe-verification"
import {
  GET_BLOCKING_RULES_STATUS_MESSAGE,
  OPEN_DASHBOARD_MESSAGE,
  REFRESH_BLOCKING_RULES_MESSAGE
} from "./lib/types"

installOsbeVerificationHandler()

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("osbe-site-blocker-refresh", {
    periodInMinutes: 1
  })

  refreshDynamicBlockingRules().catch((error) => {
    console.error("OSBE Site Blocker install refresh failed", error)
  })
})

chrome.runtime.onStartup.addListener(() => {
  refreshDynamicBlockingRules().catch((error) => {
    console.error("OSBE Site Blocker startup refresh failed", error)
  })
})

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== "osbe-site-blocker-refresh") {
    return
  }

  clearExpiredState()
    .then(() => refreshDynamicBlockingRules())
    .catch((error) => {
      console.error("OSBE Site Blocker alarm refresh failed", error)
    })
})

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes["osbe-site-blocker-state"]) {
    return
  }

  refreshDynamicBlockingRules().catch((error) => {
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
    refreshDynamicBlockingRules()
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
