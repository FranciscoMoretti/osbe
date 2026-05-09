import {
  CLIP_MESSAGE,
  type ClipMode,
  type ClipPayload,
  type ClipRequest,
  type ExtensionResponse
} from "~lib/clip-types"

export async function requestClipFromTab(
  tabId: number,
  mode: ClipMode,
  includeImages: boolean
) {
  try {
    return await sendClipMessage(tabId, mode, includeImages)
  } catch (error) {
    if (!isMissingContentScriptError(error)) {
      throw userFacingError(error)
    }
  }

  await injectContentScript(tabId)
  return sendClipMessage(tabId, mode, includeImages)
}

async function sendClipMessage(
  tabId: number,
  mode: ClipMode,
  includeImages: boolean
): Promise<ClipPayload> {
  const response = await chrome.tabs.sendMessage<
    ClipRequest,
    ExtensionResponse<ClipPayload>
  >(tabId, {
    type: CLIP_MESSAGE,
    mode,
    includeImages
  })

  if (!response) {
    throw new Error("The page did not respond to the clip request.")
  }

  if (response.ok === false) {
    throw new Error(response.error)
  }

  return response.data
}

async function injectContentScript(tabId: number) {
  const files =
    chrome.runtime
      .getManifest()
      .content_scripts?.flatMap((script) => script.js || [])
      .filter(Boolean) || []

  if (files.length === 0) {
    throw new Error("The extension content script was not found in the manifest.")
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files
    })
  } catch (error) {
    throw userFacingError(error)
  }

  await new Promise((resolve) => setTimeout(resolve, 75))
}

function isMissingContentScriptError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)

  return (
    message.includes("Receiving end does not exist") ||
    message.includes("Could not establish connection")
  )
}

function userFacingError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)

  if (
    message.includes("Cannot access contents of") ||
    message.includes("Cannot access a chrome://") ||
    message.includes("The extensions gallery cannot be scripted")
  ) {
    return new Error(
      "Chrome does not allow extensions to clip this page. Try a normal web page and reload it if needed."
    )
  }

  return error instanceof Error ? error : new Error(message)
}
