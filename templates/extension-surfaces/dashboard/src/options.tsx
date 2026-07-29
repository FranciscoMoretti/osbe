import { CheckCircle2 } from "lucide-react"
import * as React from "react"

import "~style.css"

import {
  ExtensionPageHeader,
  StatusPanel
} from "@osbe/ui/components/extension-shell"
import iconUrl from "data-base64:../assets/icon.png"

function OptionsPage() {
  return (
    <div className="min-h-screen bg-muted/40">
      <ExtensionPageHeader
        description="Local extension settings"
        iconSrc={iconUrl}
        name="{{displayName}}"
      />
      <main className="mx-auto max-w-4xl p-6">
        <StatusPanel
          description="Replace this scaffold state with your product settings."
          icon={<CheckCircle2 aria-hidden="true" />}
          title="Dashboard ready"
          tone="success"
        />
      </main>
    </div>
  )
}

export default OptionsPage
