const RESULT_PORT_PREFIX = "{{slug}}:result:"
const RESULT_TIMEOUT_MS = 15_000
const waitingPorts = new Map<string, (port: chrome.runtime.Port) => void>()

chrome.runtime.onConnect.addListener((port) => {
  if (!port.name.startsWith(RESULT_PORT_PREFIX)) return

  const sessionId = port.name.slice(RESULT_PORT_PREFIX.length)
  const resolve = waitingPorts.get(sessionId)
  if (!resolve) return

  waitingPorts.delete(sessionId)
  resolve(port)
})

chrome.action.onClicked.addListener((tab) => {
  void openResult(tab).catch((error) => {
    console.error("Failed to open the result page.", error)
  })
})

async function openResult(tab: chrome.tabs.Tab) {
  const sessionId = crypto.randomUUID()
  const resultTab = await chrome.tabs.create({
    active: false,
    url: chrome.runtime.getURL(
      `tabs/result.html?session=${encodeURIComponent(sessionId)}`
    )
  })
  const port = await waitForResultPort(sessionId)

  port.postMessage({
    type: "result",
    sourceTitle: tab.title || "Current page"
  })

  if (resultTab.id) {
    await chrome.tabs.update(resultTab.id, { active: true })
  }
}

function waitForResultPort(sessionId: string) {
  return new Promise<chrome.runtime.Port>((resolve, reject) => {
    const timeout = setTimeout(() => {
      waitingPorts.delete(sessionId)
      reject(new Error("The result page did not become ready."))
    }, RESULT_TIMEOUT_MS)

    waitingPorts.set(sessionId, (port) => {
      clearTimeout(timeout)
      resolve(port)
    })
  })
}
