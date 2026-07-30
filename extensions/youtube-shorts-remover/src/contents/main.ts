import type { PlasmoCSConfig } from "plasmo"

import {
  getShortsRedirect,
  isShortsFilterLabel,
  SHORTS_FILTERED_ATTRIBUTE,
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

type YouTubeText = {
  simpleText?: string
  runs?: Array<{ text?: string }>
}

type YouTubeFilterChip = HTMLElement & {
  data?: {
    text?: YouTubeText
  }
}

const FILTER_CHIP_SELECTOR = "yt-chip-cloud-chip-renderer"

function getFilterChipLabel(chip: YouTubeFilterChip) {
  const text = chip.data?.text
  if (text?.simpleText) return text.simpleText
  if (text?.runs) return text.runs.map((run) => run.text ?? "").join("")

  return chip.querySelector<HTMLElement>("[role='tab']")?.textContent
}

function filterShortsChip(chip: YouTubeFilterChip) {
  if (isShortsFilterLabel(getFilterChipLabel(chip))) {
    chip.setAttribute(SHORTS_FILTERED_ATTRIBUTE, "")
  }
}

function filterShortsChips(root: ParentNode) {
  if (root instanceof Element && root.matches(FILTER_CHIP_SELECTOR)) {
    filterShortsChip(root as YouTubeFilterChip)
  }

  for (const chip of root.querySelectorAll<YouTubeFilterChip>(
    FILTER_CHIP_SELECTOR
  )) {
    filterShortsChip(chip)
  }
}

function watchForShortsChips() {
  const root = document.documentElement
  if (!root) return false

  filterShortsChips(root)

  const chipObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof Element) filterShortsChips(node)
      }
    }
  })
  chipObserver.observe(root, { childList: true, subtree: true })
  return true
}

if (!installShortsFilter()) {
  const styleObserver = new MutationObserver(() => {
    if (installShortsFilter()) styleObserver.disconnect()
  })
  styleObserver.observe(document, { childList: true })
}

if (!watchForShortsChips()) {
  const documentObserver = new MutationObserver(() => {
    if (watchForShortsChips()) documentObserver.disconnect()
  })
  documentObserver.observe(document, { childList: true })
}

leaveShortsRoute()

document.addEventListener("yt-navigate-finish", leaveShortsRoute)
window.addEventListener("popstate", leaveShortsRoute)
