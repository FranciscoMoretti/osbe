type ActiveTabAdapter = {
  queryTabs(): Promise<chrome.tabs.Tab[]>
}

type ScriptResult<TResult> = {
  result?: TResult
}

type ScriptAdapter<TArgs extends unknown[], TResult> = {
  executeScript(options: {
    target: { tabId: number }
    func: (...args: TArgs) => TResult | Promise<TResult>
    args: TArgs
  }): Promise<Array<ScriptResult<TResult>>>
}

const PROTECTED_PAGE_ERRORS = [
  "Cannot access",
  "The extensions gallery cannot be scripted",
  "Missing host permission"
]

export class ProtectedPageError extends Error {
  constructor(
    message = "Chrome does not allow extensions to access this protected page. Try a regular website instead."
  ) {
    super(message)
    this.name = "ProtectedPageError"
  }
}

export async function getActiveTab(
  adapter: ActiveTabAdapter = {
    queryTabs: () => chrome.tabs.query({ active: true, currentWindow: true })
  }
) {
  const [tab] = await adapter.queryTabs()

  if (!tab) {
    throw new Error("No active browser tab was found.")
  }

  return tab
}

export async function executeInTab<TArgs extends unknown[], TResult>(
  tabId: number,
  func: (...args: TArgs) => TResult | Promise<TResult>,
  args: TArgs,
  adapter: ScriptAdapter<TArgs, TResult> = chrome.scripting
) {
  try {
    const [injection] = await adapter.executeScript({
      target: { tabId },
      func,
      args
    })

    if (!injection || !("result" in injection)) {
      throw new Error("The page did not return a result.")
    }

    return injection.result as TResult
  } catch (error) {
    throw toUserFacingChromeError(error)
  }
}

export function toUserFacingChromeError(
  error: unknown,
  fallback = "The browser action could not be completed."
) {
  const detail = error instanceof Error ? error.message : fallback

  if (PROTECTED_PAGE_ERRORS.some((message) => detail.includes(message))) {
    return new ProtectedPageError()
  }

  return error instanceof Error ? error : new Error(fallback)
}

export async function openOptionsPage() {
  if (typeof chrome !== "undefined" && chrome.runtime?.openOptionsPage) {
    await chrome.runtime.openOptionsPage()
    return
  }

  if (typeof window !== "undefined") {
    window.open("/options.html", "_blank", "noopener,noreferrer")
  }
}
