import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

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

  await evaluate(workerCdp, `(async () => {
    await chrome.storage.local.set({
      "osbe-site-blocker-state": {
        settings: { paused: false },
        rules: [
          { id: "x-rule", domain: "x.com", enabled: true, createdAt: 1 }
        ]
      }
    })
    return true
  })()`)

  await waitFor(async () => {
    const count = await evaluate(
      workerCdp,
      "chrome.declarativeNetRequest.getDynamicRules().then(rules => rules.length)"
    )
    return count > 0
  }, "Dynamic rule was not installed")

  await evaluate(workerCdp, `(async () => {
    const rules = await chrome.declarativeNetRequest.getDynamicRules()
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: rules.map((rule) => rule.id)
    })
    return true
  })()`)

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

async function fetchTargets(port) {
  const response = await fetch(`http://127.0.0.1:${port}/json/list`)
  return response.json()
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

async function waitFor(check, message) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const result = await check()
    if (result) return result
    await delay(100)
  }

  throw new Error(message)
}

function connectCdp(url) {
  const socket = new WebSocket(url)
  const pending = new Map()
  let nextId = 1

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data)
    const request = pending.get(message.id)
    if (!request) return

    pending.delete(message.id)
    clearTimeout(request.timeout)
    if (message.error) request.reject(new Error(message.error.message))
    else request.resolve(message.result)
  })

  return {
    async command(method, params = {}) {
      if (socket.readyState !== WebSocket.OPEN) {
        await Promise.race([
          new Promise((resolve, reject) => {
            socket.addEventListener("open", resolve, { once: true })
            socket.addEventListener("error", reject, { once: true })
          }),
          rejectAfter(5000, `CDP socket did not open for ${method}`)
        ])
      }

      const id = nextId++
      const response = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          pending.delete(id)
          reject(new Error(`CDP command timed out: ${method}`))
        }, 5000)
        pending.set(id, { reject, resolve, timeout })
      })
      socket.send(JSON.stringify({ id, method, params }))
      return response
    }
  }
}

async function evaluate(cdp, expression) {
  const result = await cdp.command("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  })

  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text)
  }

  return result.result.value
}

async function stopProcess(child) {
  if (child.exitCode !== null) return

  const exited = new Promise((resolve) => child.once("exit", resolve))
  child.kill("SIGTERM")
  await Promise.race([exited, delay(3000)])

  if (child.exitCode === null) {
    child.kill("SIGKILL")
  }
}

function rejectAfter(milliseconds, message) {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(message)), milliseconds)
  )
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}
