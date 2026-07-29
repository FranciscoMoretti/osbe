import { ExternalLink } from "lucide-react"
import * as React from "react"

import "~style.css"

import { openOptionsPage } from "@osbe/extension-kit/tabs"
import { Button } from "@osbe/ui/components/button"
import { ExtensionBrand } from "@osbe/ui/components/extension-brand"
import { PopupShell } from "@osbe/ui/components/extension-shell"
import iconUrl from "data-base64:../assets/icon.png"

function IndexPopup() {
  return (
    <PopupShell>
      <ExtensionBrand
        className="mb-4"
        description="Dashboard-managed settings"
        iconSrc={iconUrl}
        name="{{displayName}}"
      />
      <Button className="w-full" onClick={() => void openOptionsPage()}>
        <ExternalLink data-icon="inline-start" />
        Open dashboard
      </Button>
    </PopupShell>
  )
}

export default IndexPopup
