import { CheckCircle2, LoaderCircle } from "lucide-react"
import * as React from "react"
import { useEffect, useState } from "react"

import "~style.css"

import {
  ExtensionPageHeader,
  StatusPanel
} from "@osbe/ui/components/extension-shell"
import iconUrl from "data-base64:../../assets/icon.png"

type ResultMessage = {
  sourceTitle: string
  type: "result"
}

function ResultPage() {
  const sessionId = new URLSearchParams(window.location.search).get("session")
  const [message, setMessage] = useState<ResultMessage | null>(null)

  useEffect(() => {
    if (!sessionId) return

    const port = chrome.runtime.connect({
      name: `{{slug}}:result:${sessionId}`
    })
    const onMessage = (nextMessage: ResultMessage) => {
      if (nextMessage.type === "result") {
        setMessage(nextMessage)
      }
    }

    port.onMessage.addListener(onMessage)
    return () => port.disconnect()
  }, [sessionId])

  return (
    <div className="min-h-screen bg-muted/40">
      <ExtensionPageHeader
        description={message?.sourceTitle || "Preparing result"}
        iconSrc={iconUrl}
        name="{{displayName}}"
      />
      <main className="mx-auto max-w-2xl p-6">
        <StatusPanel
          description={
            message
              ? "Replace this scaffold state with your product result."
              : "Waiting for the browser action to finish."
          }
          icon={
            message ? (
              <CheckCircle2 aria-hidden="true" />
            ) : (
              <LoaderCircle aria-hidden="true" className="animate-spin" />
            )
          }
          title={message ? "Result ready" : "Working"}
          tone={message ? "success" : "neutral"}
        />
      </main>
    </div>
  )
}

export default ResultPage
