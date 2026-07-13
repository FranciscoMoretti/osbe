import {
  ExternalLink,
  PauseCircle,
  ShieldAlert,
  ShieldCheck
} from "lucide-react"
import * as React from "react"
import { useEffect, useMemo, useState } from "react"

import "~style.css"

import { Button } from "@osbe/ui/components/button"
import iconUrl from "data-base64:../assets/icon.png"

import { findMatchingRule } from "~/lib/matcher"
import { readState, subscribeToStateChanges } from "~/lib/storage"
import {
  DEFAULT_STATE,
  OPEN_DASHBOARD_MESSAGE,
  type AppState
} from "~/lib/types"

function IndexPopup() {
  const [state, setState] = useState<AppState>(DEFAULT_STATE)
  const [currentUrl, setCurrentUrl] = useState("")
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    readState().then((nextState) => {
      setState(nextState)
      setLoaded(true)
    })

    getCurrentTabUrl().then(setCurrentUrl)

    return subscribeToStateChanges(() => {
      readState().then(setState)
    })
  }, [])

  const match = useMemo(
    () => (currentUrl ? findMatchingRule(state, currentUrl) : null),
    [currentUrl, state]
  )

  const status = state.settings.paused
    ? {
        icon: <PauseCircle className="h-5 w-5 text-amber-700" />,
        label: "Blocking paused",
        detail: "All dashboard rules are temporarily paused."
      }
    : match?.reason === "blocked"
      ? {
          icon: <ShieldAlert className="h-5 w-5 text-red-700" />,
          label: "This site is blocked",
          detail: `${match.rule.domain} includes this website.`
        }
      : {
          icon: <ShieldCheck className="h-5 w-5 text-emerald-700" />,
          label: "Blocking active",
          detail: loaded
            ? "No active rule blocks the current tab."
            : "Reading local rule state..."
        }

  return (
    <main className="osbe-popup-shell">
      <div className="osbe-popup-frame">
        <header className="osbe-brand mb-4">
          <div className="osbe-brand-icon h-10 w-10">
            <img alt="" aria-hidden="true" src={iconUrl} />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold leading-5">
              Site Blocker
            </h1>
            <p className="text-xs font-medium leading-4 text-muted-foreground">
              Dashboard-managed rules
            </p>
          </div>
        </header>

        <section className="osbe-status-card">
          <div className="flex items-start gap-3">
            <div className="osbe-status-icon">{status.icon}</div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold leading-5">{status.label}</h2>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                {status.detail}
              </p>
            </div>
          </div>
        </section>

        <Button className="mt-4 w-full" onClick={openDashboard} type="button">
          <ExternalLink />
          Open dashboard
        </Button>
      </div>
    </main>
  )
}

async function getCurrentTabUrl() {
  if (typeof chrome === "undefined" || !chrome.tabs?.query) {
    return window.location.href
  }

  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  })

  return tab?.url || ""
}

async function openDashboard() {
  if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
    try {
      await chrome.runtime.sendMessage({ type: OPEN_DASHBOARD_MESSAGE })
      window.close()
      return
    } catch {
      window.open(
        chrome.runtime.getURL("options.html"),
        "_blank",
        "noopener,noreferrer"
      )
      return
    }
  }

  window.open("/options.html", "_blank", "noopener,noreferrer")
}

export default IndexPopup
