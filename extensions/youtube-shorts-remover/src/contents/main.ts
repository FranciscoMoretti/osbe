import type { PlasmoCSConfig } from "plasmo"

import {
  getShortsRedirect,
  SHORTS_FILTER_CSS,
  SHORTS_STYLE_ID
} from "../lib/shorts-filter"

export const config: PlasmoCSConfig = {
  matches: ["https://www.youtube.com/*"],
  run_at: "document_start"
}

function installShortsFilter() {
  if (document.getElementById(SHORTS_STYLE_ID)) return true

  const styleContainer = document.head ?? document.documentElement
  if (!styleContainer) return false
  const style = document.createElement("style")
  style.id = SHORTS_STYLE_ID
  style.textContent = SHORTS_FILTER_CSS
  styleContainer.append(style)
  return true
}

function leaveShortsRoute() {
  const destination = getShortsRedirect(location.href)
  if (destination) location.replace(destination)
}

if (!installShortsFilter()) {
  const styleObserver = new MutationObserver(() => {
    if (installShortsFilter()) styleObserver.disconnect()
  })
  styleObserver.observe(document, { childList: true })
}

leaveShortsRoute()

document.addEventListener("yt-navigate-finish", leaveShortsRoute)
window.addEventListener("popstate", leaveShortsRoute)
