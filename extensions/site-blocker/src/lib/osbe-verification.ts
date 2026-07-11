const OSBE_VERIFY_MESSAGE = "osbe/extension:verify"
const OSBE_VERIFICATION_ORIGINS = new Set([
  "https://osbe.dev",
  "https://www.osbe.dev"
])
const OSBE_VERIFICATION_URL = "https://osbe.dev/verify-extension"
const VERIFICATION_CHALLENGE_STORAGE_KEY =
  "osbe-site-blocker-verification-challenge"
const VERIFICATION_CHALLENGE_TTL_MS = 5 * 60 * 1000

type StoredVerificationChallenge = {
  challenge: string
  expiresAt: number
}

type VerificationRequest = {
  type: typeof OSBE_VERIFY_MESSAGE
  challenge: string
  extensionSlug: string
}

const extensionSlug = "site-blocker"
const displayName = "OSBE Site Blocker"

export async function openOsbeVerificationPage() {
  const challenge = createChallenge()
  const expiresAt = Date.now() + VERIFICATION_CHALLENGE_TTL_MS

  await chrome.storage.local.set({
    [VERIFICATION_CHALLENGE_STORAGE_KEY]: { challenge, expiresAt }
  })

  const verificationUrl = new URL(OSBE_VERIFICATION_URL)
  verificationUrl.searchParams.set("extension", extensionSlug)
  verificationUrl.searchParams.set("challenge", challenge)

  await chrome.tabs.create({ url: verificationUrl.toString() })
}

export function installOsbeVerificationHandler() {
  chrome.runtime.onMessageExternal.addListener(
    (message: VerificationRequest, sender, sendResponse) => {
      if (!isVerificationRequest(message) || !isAllowedSender(sender.url)) {
        return false
      }

      verifyChallenge(message.challenge)
        .then((verified) => {
          if (!verified) {
            sendResponse({
              ok: false,
              error: "The verification challenge is missing or expired."
            })
            return
          }

          sendResponse({
            ok: true,
            data: {
              challenge: message.challenge,
              displayName,
              extensionSlug,
              runtimeId: chrome.runtime.id,
              version: chrome.runtime.getManifest().version
            }
          })
        })
        .catch((error) => {
          sendResponse({
            ok: false,
            error:
              error instanceof Error ? error.message : "Verification failed."
          })
        })

      return true
    }
  )
}

function isVerificationRequest(
  message: Partial<VerificationRequest> | null | undefined
): message is VerificationRequest {
  return (
    message?.type === OSBE_VERIFY_MESSAGE &&
    message.extensionSlug === extensionSlug &&
    typeof message.challenge === "string" &&
    message.challenge.length >= 32
  )
}

function isAllowedSender(senderUrl: string | undefined) {
  if (!senderUrl) {
    return false
  }

  try {
    return OSBE_VERIFICATION_ORIGINS.has(new URL(senderUrl).origin)
  } catch {
    return false
  }
}

async function verifyChallenge(challenge: string) {
  const stored = await chrome.storage.local.get(
    VERIFICATION_CHALLENGE_STORAGE_KEY
  )
  const verificationChallenge = stored[VERIFICATION_CHALLENGE_STORAGE_KEY] as
    | StoredVerificationChallenge
    | undefined

  if (
    verificationChallenge?.challenge !== challenge ||
    verificationChallenge.expiresAt < Date.now()
  ) {
    return false
  }

  await chrome.storage.local.remove(VERIFICATION_CHALLENGE_STORAGE_KEY)
  return true
}

function createChallenge() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  )
}
