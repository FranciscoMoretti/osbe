import { spawn } from "node:child_process"
import { createHash, generateKeyPairSync } from "node:crypto"
import { access, cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

const CHROME_START_TIMEOUT_MS = 20_000

export async function smokeExtensionInChrome(repoRoot, extension) {
  const buildRoot = path.join(
    repoRoot,
    "extensions",
    extension.slug,
    "build",
    "chrome-mv3-prod"
  )
  const manifestPath = path.join(buildRoot, "manifest.json")
  await access(manifestPath)

  const temporaryRoot = await mkdtemp(
    path.join(os.tmpdir(), "osbe-chrome-smoke-")
  )
  const extensionRoot = path.join(temporaryRoot, "extension")
  const profileRoot = path.join(temporaryRoot, "profile")

  try {
    await cp(buildRoot, extensionRoot, { recursive: true })
    const manifest = JSON.parse(
      await readFile(path.join(extensionRoot, "manifest.json"), "utf8")
    )
    const publicKey = createTestPublicKey()
    manifest.key = publicKey.toString("base64")
    await writeFile(
      path.join(extensionRoot, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`
    )

    const extensionId = extensionIdFromPublicKey(publicKey)
    const pageUrl = `chrome-extension://${extensionId}/${extension.smoke.page}`
    const chromePath = await findChromeExecutable()
    const chrome = spawn(
      chromePath,
      [
        "--headless=new",
        "--disable-background-networking",
        "--disable-component-update",
        "--disable-default-apps",
        "--disable-extensions-except=" + extensionRoot,
        "--disable-gpu",
        "--load-extension=" + extensionRoot,
        "--no-first-run",
        "--no-default-browser-check",
        "--remote-debugging-port=0",
        "--user-data-dir=" + profileRoot,
        pageUrl
      ],
      {
        stdio: ["ignore", "ignore", "pipe"]
      }
    )

    try {
      const port = await waitForDevtoolsPort(chrome)
      const target = await waitForTarget(port, pageUrl)

      return {
        extensionId,
        pageUrl,
        title: target.title
      }
    } finally {
      await stopChrome(chrome)
    }
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true })
  }
}

function stopChrome(chrome) {
  if (chrome.exitCode !== null || chrome.signalCode !== null) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    const forceTimeout = setTimeout(() => {
      chrome.kill("SIGKILL")
    }, 2_000)

    chrome.once("exit", () => {
      clearTimeout(forceTimeout)
      resolve()
    })
    chrome.kill("SIGTERM")
  })
}

export function extensionIdFromPublicKey(publicKey) {
  const hex = createHash("sha256").update(publicKey).digest("hex").slice(0, 32)
  return Array.from(hex, (digit) =>
    String.fromCharCode("a".charCodeAt(0) + Number.parseInt(digit, 16))
  ).join("")
}

function createTestPublicKey() {
  const { publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 1024,
    publicKeyEncoding: {
      type: "spki",
      format: "der"
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "der"
    }
  })

  return publicKey
}

async function findChromeExecutable() {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
  ].filter(Boolean)

  for (const candidate of candidates) {
    try {
      await access(candidate)
      return candidate
    } catch {
      // Try the next well-known Chrome location.
    }
  }

  throw new Error(
    "Chrome was not found. Set CHROME_PATH to run the extension smoke test."
  )
}

function waitForDevtoolsPort(chrome) {
  return new Promise((resolve, reject) => {
    let stderr = ""
    const timeout = setTimeout(() => {
      reject(new Error(`Chrome did not start DevTools.\n${stderr}`))
    }, CHROME_START_TIMEOUT_MS)

    chrome.stderr.setEncoding("utf8")
    chrome.stderr.on("data", (chunk) => {
      stderr += chunk
      const match = stderr.match(
        /DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//
      )
      if (!match) return

      clearTimeout(timeout)
      resolve(Number(match[1]))
    })
    chrome.once("exit", (code) => {
      clearTimeout(timeout)
      reject(
        new Error(`Chrome exited before the smoke test started (${code}).`)
      )
    })
  })
}

async function waitForTarget(port, pageUrl) {
  const deadline = Date.now() + CHROME_START_TIMEOUT_MS

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json`)
      const targets = await response.json()
      const target = targets.find(
        (candidate) => candidate.type === "page" && candidate.url === pageUrl
      )

      if (target && !target.title.startsWith("Error")) {
        return target
      }
    } catch {
      // Chrome may expose the port before the first target is ready.
    }

    await new Promise((resolve) => setTimeout(resolve, 200))
  }

  throw new Error(`Chrome did not load the extension page: ${pageUrl}`)
}
