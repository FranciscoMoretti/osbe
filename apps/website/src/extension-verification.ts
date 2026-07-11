const OSBE_VERIFY_MESSAGE = "osbe/extension:verify"

type BrowserRuntime = {
  lastError?: { message?: string }
  sendMessage(
    extensionId: string,
    message: unknown,
    callback: (response: unknown) => void
  ): void
}

type VerificationResponse =
  | {
      ok: true
      data: {
        challenge: string
        displayName: string
        extensionSlug: string
        runtimeId: string
        version: string
      }
    }
  | {
      ok: false
      error: string
    }

export type OsbeExtensionSlug = "markdown-clipper" | "site-blocker"

export type OsbeExtensionVerificationResult =
  | {
      ok: true
      displayName: string
      extensionId: string
      extensionSlug: OsbeExtensionSlug
      version: string
    }
  | {
      ok: false
      error: string
      extensionSlug: OsbeExtensionSlug
    }

export const OSBE_EXTENSION_REGISTRY: Record<
  OsbeExtensionSlug,
  {
    chromeWebStoreId: string
    displayName: string
    slug: OsbeExtensionSlug
  }
> = {
  "markdown-clipper": {
    chromeWebStoreId: "REPLACE_WITH_MARKDOWN_CLIPPER_CHROME_WEB_STORE_ID",
    displayName: "OSBE Markdown Clipper",
    slug: "markdown-clipper"
  },
  "site-blocker": {
    chromeWebStoreId: "REPLACE_WITH_SITE_BLOCKER_CHROME_WEB_STORE_ID",
    displayName: "OSBE Site Blocker",
    slug: "site-blocker"
  }
}

export async function verifyOsbeExtensionInstall(
  extensionSlug: OsbeExtensionSlug,
  challenge: string
): Promise<OsbeExtensionVerificationResult> {
  const extension = OSBE_EXTENSION_REGISTRY[extensionSlug]

  if (extension.chromeWebStoreId.startsWith("REPLACE_WITH_")) {
    return {
      ok: false,
      error: "This OSBE extension does not have a configured Web Store ID yet.",
      extensionSlug
    }
  }

  if (!isValidChallenge(challenge)) {
    return {
      ok: false,
      error: "The verification link is missing a valid challenge.",
      extensionSlug
    }
  }

  const runtime = getBrowserRuntime()

  if (!runtime) {
    return {
      ok: false,
      error: "This browser cannot contact installed Chrome extensions.",
      extensionSlug
    }
  }

  const response = await sendRuntimeMessage(
    runtime,
    extension.chromeWebStoreId,
    {
      type: OSBE_VERIFY_MESSAGE,
      challenge,
      extensionSlug
    }
  )

  if (!response.ok) {
    return {
      ok: false,
      error: response.error,
      extensionSlug
    }
  }

  const data = response.data

  if (
    data.challenge !== challenge ||
    data.extensionSlug !== extension.slug ||
    data.runtimeId !== extension.chromeWebStoreId
  ) {
    return {
      ok: false,
      error: "The installed extension did not match the official OSBE ID.",
      extensionSlug
    }
  }

  return {
    ok: true,
    displayName: data.displayName,
    extensionId: data.runtimeId,
    extensionSlug,
    version: data.version
  }
}

function getBrowserRuntime(): BrowserRuntime | null {
  const runtime = (
    globalThis as typeof globalThis & {
      chrome?: { runtime?: BrowserRuntime }
    }
  ).chrome?.runtime

  return runtime?.sendMessage ? runtime : null
}

function sendRuntimeMessage(
  runtime: BrowserRuntime,
  extensionId: string,
  message: unknown
) {
  return new Promise<VerificationResponse>((resolve) => {
    runtime.sendMessage(extensionId, message, (response) => {
      if (runtime.lastError) {
        resolve({
          ok: false,
          error:
            runtime.lastError.message ||
            "The official OSBE extension did not respond."
        })
        return
      }

      if (isVerificationResponse(response)) {
        resolve(response)
        return
      }

      resolve({
        ok: false,
        error: "The extension returned an invalid verification response."
      })
    })
  })
}

function isVerificationResponse(
  response: unknown
): response is VerificationResponse {
  if (!response || typeof response !== "object") {
    return false
  }

  const candidate = response as Partial<VerificationResponse>

  if (candidate.ok === false) {
    return typeof candidate.error === "string"
  }

  return (
    candidate.ok === true &&
    typeof candidate.data?.challenge === "string" &&
    typeof candidate.data.displayName === "string" &&
    typeof candidate.data.extensionSlug === "string" &&
    typeof candidate.data.runtimeId === "string" &&
    typeof candidate.data.version === "string"
  )
}

function isValidChallenge(challenge: string) {
  return /^[a-f0-9]{64}$/.test(challenge)
}
