import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"

import {
  connectCdp,
  evaluate,
  fetchTargets,
  stopProcess,
  waitFor,
  waitForDevtoolsPort
} from "./lib/chrome-cdp.mjs"

const chromePath =
  process.env.CHROME_PATH ||
  [
    "/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
  ].find(existsSync)

assert(
  chromePath,
  "Set CHROME_PATH to a Google Chrome for Testing executable. Stable branded Chrome ignores command-line unpacked extensions."
)

const extensionPath = resolve(
  "extensions/youtube-shorts-remover/build/chrome-mv3-prod"
)
const screenshotPath = resolve(
  "extensions/youtube-shorts-remover/store-assets/screenshots/youtube-shorts-remover-1280x800.png"
)
const searchUrl = "https://www.youtube.com/results?search_query=javascript"
const profilePath = await mkdtemp(join(tmpdir(), "osbe-shorts-check-"))
const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-default-apps",
    "--disable-extensions-except=" + extensionPath,
    "--disable-gpu",
    "--lang=en-GB",
    "--load-extension=" + extensionPath,
    "--no-default-browser-check",
    "--no-first-run",
    "--no-sandbox",
    "--remote-debugging-port=0",
    "--user-data-dir=" + profilePath,
    "--window-size=1280,800",
    searchUrl
  ],
  { stdio: ["ignore", "ignore", "pipe"] }
)

try {
  const port = await waitForDevtoolsPort(chrome)
  const page = await waitForPage(port)
  const cdp = connectCdp(page.webSocketDebuggerUrl)
  await cdp.command("Page.enable")
  await cdp.command("Runtime.enable")
  await cdp.command("Emulation.setDeviceMetricsOverride", {
    deviceScaleFactor: 1,
    height: 800,
    mobile: false,
    width: 1280
  })

  await waitFor(
    async () =>
      evaluate(
        cdp,
        "document.readyState !== 'loading' && document.title.includes('javascript')"
      ),
    "YouTube search results did not load"
  )

  await rejectOptionalConsent(cdp)

  let lastObservedState
  const state = await waitFor(
    async () => {
      lastObservedState = await evaluate(
        cdp,
        `(() => {
          const links = Array.from(document.querySelectorAll("a[href^='/shorts/']"))
          const visibleLinks = links.filter((link) => link.getClientRects().length > 0)

          return {
            hasFilterStyle: Boolean(
              document.getElementById("osbe-youtube-shorts-filter")
            ),
            shortsLinkCount: links.length,
            visibleShortsLinkCount: visibleLinks.length,
            firstShortsHref: links.find(
              (link) => link.getAttribute("href") !== "/shorts/"
            )?.href
          }
        })()`
      )

      return lastObservedState.hasFilterStyle &&
        lastObservedState.shortsLinkCount > 1
        ? lastObservedState
        : null
    },
    () =>
      `The content filter did not activate on populated YouTube results: ${JSON.stringify(lastObservedState)}`
  )

  assert.equal(
    state.visibleShortsLinkCount,
    0,
    "A YouTube Shorts link remained visible"
  )
  assert(state.firstShortsHref, "YouTube returned no direct Shorts test URL")

  const screenshot = await cdp.command("Page.captureScreenshot", {
    captureBeyondViewport: false,
    format: "png"
  })
  await mkdir(dirname(screenshotPath), { recursive: true })
  await writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"))

  await verifyRepresentativeSurfaces(cdp)

  await evaluate(
    cdp,
    `location.href = ${JSON.stringify(state.firstShortsHref)}`
  )
  await waitFor(
    async () => evaluate(cdp, "location.pathname === '/'"),
    "A direct Shorts URL was not redirected to YouTube home"
  )

  console.log(
    "PASS: Chrome loaded the extension, hid populated Shorts surfaces, redirected a direct Shorts URL, and captured the store screenshot."
  )
} finally {
  await stopProcess(chrome)
  await rm(profilePath, { recursive: true, force: true })
}

async function verifyRepresentativeSurfaces(cdp) {
  const visibility = await evaluate(
    cdp,
    `(() => {
      const fixture = document.createElement("div")
      const surfaces = [
        ["ytd-reel-shelf-renderer", "home-shelf"],
        ["ytd-mini-guide-entry-renderer", "navigation", "/shorts/"],
        ["grid-shelf-view-model", "search-results", "/shorts/search-fixture"],
        ["ytd-rich-item-renderer", "home-feed", "/shorts/home-fixture"],
        [
          "ytd-video-renderer",
          "subscriptions-feed",
          "/shorts/subscriptions-fixture"
        ],
        [
          "ytd-compact-video-renderer",
          "watch-recommendations",
          "/shorts/watch-fixture"
        ],
        ["yt-tab-shape", "channel-tab", "/@fixture/shorts"]
      ]

      for (const [tagName, surface, href] of surfaces) {
        const element = document.createElementNS("urn:osbe-verifier", tagName)
        element.setAttribute("data-surface", surface)
        element.textContent = surface
        if (href) {
          const link = document.createElement("a")
          link.href = href
          element.append(link)
        }
        fixture.append(element)
      }
      document.body.append(fixture)

      return Object.fromEntries(
        Array.from(fixture.querySelectorAll("[data-surface]")).map((element) => [
          element.getAttribute("data-surface"),
          element.getClientRects().length > 0
        ])
      )
    })()`
  )

  for (const [surface, visible] of Object.entries(visibility)) {
    assert.equal(visible, false, `${surface} Shorts fixture remained visible`)
  }
}

async function rejectOptionalConsent(cdp) {
  const hasConsent = await evaluate(
    cdp,
    `(() => {
      const button = Array.from(document.querySelectorAll("button")).find(
        (candidate) =>
          candidate.textContent.trim() === "Reject all" ||
          candidate.getAttribute("aria-label")?.startsWith("Reject the use")
      )
      return Boolean(button)
    })()`
  )

  if (hasConsent) {
    await evaluate(
      cdp,
      `(() => {
        document.cookie =
          "SOCS=CAI; domain=.youtube.com; path=/; SameSite=Lax; Secure"
        setTimeout(() => location.reload(), 0)
        return true
      })()`
    )
    await waitFor(
      async () =>
        evaluate(
          cdp,
          `(() => {
            const dialog = document.querySelector(
              "ytd-consent-bump-v2-lightbox"
            )
            return !dialog || dialog.getClientRects().length === 0
          })()`
        ),
      "YouTube consent dialog did not close"
    )
  }
}

async function waitForPage(portNumber) {
  return waitFor(async () => {
    try {
      const targets = await fetchTargets(portNumber)
      return targets.find(
        (target) =>
          target.type === "page" &&
          target.url.startsWith("https://www.youtube.com/")
      )
    } catch {
      return null
    }
  }, "Chrome did not expose the YouTube verification page")
}
