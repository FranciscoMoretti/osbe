import {
  ExternalLink,
  PauseCircle,
  ShieldAlert,
  ShieldCheck
} from "lucide-react"
import * as React from "react"
import { useEffect, useMemo, useState } from "react"

import "~style.css"

import { getActiveTab, openOptionsPage } from "@osbe/extension-kit/tabs"
import { Button } from "@osbe/ui/components/button"
import { ExtensionBrand } from "@osbe/ui/components/extension-brand"
import { PopupShell, StatusPanel } from "@osbe/ui/components/extension-shell"
import iconUrl from "data-base64:../assets/icon.png"

import { findMatchingRule } from "~/lib/matcher"
import { readState, subscribeToStateChanges } from "~/lib/storage"
import { DEFAULT_STATE, type AppState } from "~/lib/types"

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
        icon: <PauseCircle className="h-5 w-5" />,
        label: "Blocking paused",
        detail: "All dashboard rules are temporarily paused.",
        tone: "warning" as const
      }
    : match?.reason === "blocked"
      ? {
          icon: <ShieldAlert className="h-5 w-5" />,
          label: "This site is blocked",
          detail: `${match.rule.domain} includes this website.`,
          tone: "error" as const
        }
      : {
          icon: <ShieldCheck className="h-5 w-5" />,
          label: "Blocking active",
          detail: loaded
            ? "No active rule blocks the current tab."
            : "Reading local rule state...",
          tone: loaded ? ("success" as const) : ("neutral" as const)
        }

  return (
    <PopupShell className="w-[382px] overflow-hidden">
      <ExtensionBrand
        className="mb-4"
        description="Dashboard-managed rules"
        iconSrc={iconUrl}
        name="Site Blocker"
      />

      <StatusPanel
        description={status.detail}
        icon={status.icon}
        title={status.label}
        tone={status.tone}
      />

      <Button className="mt-4 w-full" onClick={openDashboard} type="button">
        <ExternalLink data-icon="inline-start" />
        Open dashboard
      </Button>
    </PopupShell>
  )
}

async function getCurrentTabUrl() {
  if (typeof chrome === "undefined" || !chrome.tabs?.query) {
    return window.location.href
  }

  const tab = await getActiveTab()

  return tab?.url || ""
}

async function openDashboard() {
  await openOptionsPage()
  window.close()
}

export default IndexPopup
