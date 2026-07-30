import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["{{contentMatch}}"],
  run_at: "document_start"
}

const activationMarker = document.createElement("style")
activationMarker.id = "osbe-{{slug}}-active"
activationMarker.textContent = "/* Add the automatic page behavior here. */"
;(document.head ?? document.documentElement).append(activationMarker)

// {{displayName}} runs automatically on the matched pages.
