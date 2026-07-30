import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

import {
  connectCdp,
  evaluate,
  fetchTargets,
  stopProcess,
  waitFor
} from "./lib/chrome-cdp.mjs"

const chromePath =
  process.env.CHROME_PATH ||
  [
    join(
      process.env.HOME || "",
      "Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
    ),
    "/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  ].find(existsSync)

assert(chromePath, "No Chrome executable was found")
const extensionPath = resolve("extensions/site-blocker/build/chrome-mv3-prod")
const profilePath = await mkdtemp(join(tmpdir(), "osbe-navigation-check-"))
const port = 9423
const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--user-data-dir=${profilePath}`,
    `--remote-debugging-port=${port}`,
    `--load-extension=${extensionPath}`,
    "about:blank"
  ],
  { stdio: "ignore" }
)

try {
  const targets = await waitForTargets(port)
  const worker = targets.find(
    (target) =>
      target.type === "service_worker" &&
      target.url.endsWith("/static/background/index.js")
  )
  const page = targets.find((target) => target.type === "page")

  assert(worker, "The site blocker service worker did not start")
  assert(page, "Chrome did not expose a navigation test page")

  const workerCdp = connectCdp(worker.webSocketDebuggerUrl)
  const pageCdp = connectCdp(page.webSocketDebuggerUrl)

  await evaluate(
    workerCdp,
    `(async () => {
    await chrome.storage.local.set({
      "osbe-site-blocker-state": {
        settings: { paused: false },
        rules: [
          { id: "x-rule", domain: "x.com", enabled: true, createdAt: 1 }
        ]
      }
    })
    return true
  })()`
  )

  await waitFor(async () => {
    const count = await evaluate(
      workerCdp,
      "chrome.declarativeNetRequest.getDynamicRules().then(rules => rules.length)"
    )
    return count > 0
  }, "Dynamic rule was not installed")

  await evaluate(
    workerCdp,
    `(async () => {
    const rules = await chrome.declarativeNetRequest.getDynamicRules()
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: rules.map((rule) => rule.id)
    })
    return true
  })()`
  )

  await pageCdp.command("Page.navigate", { url: "https://x.com/home" })

  const blockedTarget = await waitFor(async () => {
    const currentTargets = await fetchTargets(port)
    return currentTargets.find(
      (target) =>
        target.type === "page" && target.url.includes("/tabs/blocked.html")
    )
  }, "Fallback navigation enforcement did not redirect x.com")

  assert.match(blockedTarget.url, /[?&]rule=x-rule(?:&|$)/)
  console.log(
    "PASS: x.com was redirected by the navigation safety net with DNR removed"
  )
} finally {
  await stopProcess(chrome)
  await rm(profilePath, { recursive: true, force: true })
}

async function waitForTargets(port) {
  return waitFor(async () => {
    try {
      const targets = await fetchTargets(port)
      return targets.some(
        (target) =>
          target.type === "service_worker" &&
          target.url.endsWith("/static/background/index.js")
      )
        ? targets
        : null
    } catch {
      return null
    }
  }, "Chrome or the site blocker service worker did not start")
}
