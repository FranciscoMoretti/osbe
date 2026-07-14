import { ExternalLink, ShieldX } from "lucide-react"
import * as React from "react"
import { useEffect, useMemo, useState } from "react"

import "~style.css"

import { Button } from "@osbe/ui/components/button"

import { readState, subscribeToStateChanges } from "~/lib/storage"
import {
  DEFAULT_STATE,
  OPEN_DASHBOARD_MESSAGE,
  type AppState
} from "~/lib/types"

function BlockedPage() {
  const [state, setState] = useState<AppState>(DEFAULT_STATE)
  const ruleId = new URLSearchParams(window.location.search).get("rule")
  const rule = useMemo(
    () => state.rules.find((candidate) => candidate.id === ruleId),
    [ruleId, state.rules]
  )

  useEffect(() => {
    let active = true

    const refreshState = () => {
      void readState()
        .then((nextState) => {
          if (active) {
            setState(nextState)
          }
        })
        .catch(() => {
          // Keep the blocked page usable when an extension reload invalidates it.
        })
    }

    refreshState()

    const unsubscribe = subscribeToStateChanges(refreshState)

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  return (
    <main className="osbe-blocked-page">
      <section className="osbe-blocked-card">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700">
            <ShieldX className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold leading-8">
              Blocked by OSBE Site Blocker
            </h1>
            <p className="mt-2 text-base leading-7 text-muted-foreground">
              This page matches an active local block rule. Manage access in the
              dashboard.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-lg border bg-muted/50 p-4">
          <span className="osbe-label">Matched rule</span>
          <p className="mt-2 text-base font-bold leading-6">
            {rule?.domain || "Blocked website"}
          </p>
          <p className="mt-1 break-all font-mono text-sm leading-5 text-muted-foreground">
            {rule
              ? "Includes all pages and subdomains"
              : "Open the dashboard to review rule details."}
          </p>
        </div>

        <Button className="mt-6" onClick={openDashboard} type="button">
          <ExternalLink />
          Open dashboard
        </Button>
      </section>
    </main>
  )
}

async function openDashboard() {
  if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
    try {
      await chrome.runtime.sendMessage({ type: OPEN_DASHBOARD_MESSAGE })
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

export default BlockedPage
