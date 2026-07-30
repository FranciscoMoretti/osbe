export async function fetchTargets(port) {
  const response = await fetch(`http://127.0.0.1:${port}/json/list`)
  return response.json()
}

export async function waitFor(
  check,
  message,
  { attempts = 200, intervalMs = 100 } = {}
) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const result = await check()
    if (result) return result
    await delay(intervalMs)
  }

  throw new Error(typeof message === "function" ? message() : message)
}

export function waitForDevtoolsPort(child, { timeoutMs = 20_000 } = {}) {
  return new Promise((resolvePort, rejectPort) => {
    let stderr = ""
    const timeout = setTimeout(() => {
      rejectPort(new Error(`Chrome did not start DevTools.\n${stderr}`))
    }, timeoutMs)

    child.stderr.setEncoding("utf8")
    child.stderr.on("data", (chunk) => {
      stderr += chunk
      const match = stderr.match(
        /DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//
      )
      if (!match) return

      clearTimeout(timeout)
      resolvePort(Number(match[1]))
    })
    child.once("exit", (code) => {
      clearTimeout(timeout)
      rejectPort(
        new Error(
          `Chrome exited before browser verification started (${code}).`
        )
      )
    })
  })
}

export function connectCdp(url, { commandTimeoutMs = 15_000 } = {}) {
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
          new Promise((resolveOpen, rejectOpen) => {
            socket.addEventListener("open", resolveOpen, { once: true })
            socket.addEventListener("error", rejectOpen, { once: true })
          }),
          rejectAfter(5000, `CDP socket did not open for ${method}`)
        ])
      }

      const id = nextId++
      const response = new Promise((resolveResponse, rejectResponse) => {
        const timeout = setTimeout(() => {
          pending.delete(id)
          rejectResponse(new Error(`CDP command timed out: ${method}`))
        }, commandTimeoutMs)
        pending.set(id, {
          reject: rejectResponse,
          resolve: resolveResponse,
          timeout
        })
      })
      socket.send(JSON.stringify({ id, method, params }))
      return response
    }
  }
}

export async function evaluate(cdp, expression) {
  const result = await cdp.command("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  })

  if (result.exceptionDetails) {
    throw new Error(
      result.exceptionDetails.exception?.description ??
        result.exceptionDetails.text
    )
  }

  return result.result.value
}

export async function stopProcess(child, { forceAfterMs = 3000 } = {}) {
  if (child.exitCode !== null || child.signalCode !== null) return

  const exited = new Promise((resolveExit) => child.once("exit", resolveExit))
  child.kill("SIGTERM")
  await Promise.race([exited, delay(forceAfterMs)])

  if (child.exitCode === null && child.signalCode === null) {
    child.kill("SIGKILL")
  }
}

export function rejectAfter(milliseconds, message) {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(message)), milliseconds)
  )
}

export function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds))
}
