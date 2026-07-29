import { Check } from "lucide-react"
import * as React from "react"

import "~style.css"

import { Button } from "@osbe/ui/components/button"
import { ExtensionBrand } from "@osbe/ui/components/extension-brand"
import { PopupShell } from "@osbe/ui/components/extension-shell"
import iconUrl from "data-base64:../assets/icon.png"

function IndexPopup() {
  return (
    <PopupShell>
      <ExtensionBrand
        className="mb-4"
        description="Runs only when invoked"
        iconSrc={iconUrl}
        name="{{displayName}}"
      />
      <Button className="w-full">
        <Check data-icon="inline-start" />
        Ready
      </Button>
    </PopupShell>
  )
}

export default IndexPopup
