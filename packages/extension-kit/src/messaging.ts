export type ExtensionResponse<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string }

type MessageSender = (message: unknown) => Promise<unknown>

export function success<T>(data: T): ExtensionResponse<T> {
  return { ok: true, data }
}

export function failure(
  error: unknown,
  fallback = "The extension request failed."
): ExtensionResponse<never> {
  return {
    ok: false,
    error:
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : fallback
  }
}

export function unwrapExtensionResponse<T>(
  response: ExtensionResponse<T> | undefined,
  missingResponseMessage = "The extension did not respond."
) {
  if (!response) {
    throw new Error(missingResponseMessage)
  }

  if (response.ok === false) {
    throw new Error(response.error)
  }

  return response.data
}

export async function sendExtensionRequest<TRequest, TResult>(
  request: TRequest,
  options: {
    missingResponseMessage?: string
    sendMessage?: MessageSender
  } = {}
) {
  const sendMessage =
    options.sendMessage ??
    ((message: unknown) => chrome.runtime.sendMessage(message))
  const response = (await sendMessage(request)) as
    | ExtensionResponse<TResult>
    | undefined

  return unwrapExtensionResponse(response, options.missingResponseMessage)
}

export function respondWith<T>(
  sendResponse: (response: ExtensionResponse<T>) => void,
  operation: () => Promise<T>,
  fallback: string
) {
  void operation()
    .then((data) => sendResponse(success(data)))
    .catch((error) => sendResponse(failure(error, fallback)))

  return true
}
