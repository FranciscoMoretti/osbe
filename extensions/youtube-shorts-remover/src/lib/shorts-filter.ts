const YOUTUBE_HOSTS = new Set(["www.youtube.com", "youtube.com"])

export const SHORTS_STYLE_ID = "osbe-youtube-shorts-filter"
export const SHORTS_FILTERED_ATTRIBUTE = "data-osbe-shorts-filtered"

export const SHORTS_NAVIGATION_ENTRY_SELECTOR = [
  "ytd-guide-entry-renderer",
  "ytd-mini-guide-entry-renderer",
  "ytm-pivot-bar-item-renderer"
].join(",\n")

export const SHORTS_CONTAINER_SELECTORS = [
  "ytd-reel-shelf-renderer",
  "ytd-reel-item-renderer",
  "ytm-shorts-lockup-view-model",
  "ytm-shorts-lockup-view-model-v2",
  "grid-shelf-view-model:has(a[href^='/shorts/'])",
  "ytd-rich-shelf-renderer:has(a[href^='/shorts/'])",
  "ytd-rich-section-renderer:has(a[href^='/shorts/'])",
  "ytd-rich-item-renderer:has(a[href^='/shorts/'])",
  "ytd-video-renderer:has(a[href^='/shorts/'])",
  "ytd-grid-video-renderer:has(a[href^='/shorts/'])",
  "ytd-compact-video-renderer:has(a[href^='/shorts/'])",
  "yt-lockup-view-model:has(a[href^='/shorts/'])",
  "ytd-guide-entry-renderer:has(a[href^='/shorts'])",
  "ytd-mini-guide-entry-renderer:has(a[href^='/shorts'])",
  "ytm-pivot-bar-item-renderer:has(a[href^='/shorts'])",
  "yt-tab-shape:has(a[href$='/shorts'])",
  "tp-yt-paper-tab:has(a[href$='/shorts'])"
] as const

export const SHORTS_FILTER_CSS = `
${SHORTS_CONTAINER_SELECTORS.join(",\n")},
[${SHORTS_FILTERED_ATTRIBUTE}] {
  display: none !important;
}
`

export function isShortsFilterLabel(label: string | null | undefined) {
  return label?.trim().toLowerCase() === "shorts"
}

export function isShortsPath(path: string | null | undefined) {
  return path === "/shorts" || path?.startsWith("/shorts/") === true
}

export function getShortsRedirect(href: string) {
  const url = new URL(href)
  if (!YOUTUBE_HOSTS.has(url.hostname)) return undefined

  if (/^\/shorts(?:\/|$)/.test(url.pathname)) {
    return `${url.origin}/`
  }

  const channelShorts = url.pathname.match(
    /^\/((?:@[^/]+)|(?:channel|c|user)\/[^/]+)\/shorts\/?$/
  )
  if (channelShorts) {
    return `${url.origin}/${channelShorts[1]}`
  }

  return undefined
}
