import assert from "node:assert/strict"
import test from "node:test"

import {
  failure,
  respondWith,
  sendExtensionRequest,
  success
} from "./messaging"

test("unwraps successful extension requests", async () => {
  const result = await sendExtensionRequest<{ type: "ping" }, string>(
    { type: "ping" },
    {
      sendMessage: async () => success("pong")
    }
  )

  assert.equal(result, "pong")
})

test("throws the remote extension error", async () => {
  await assert.rejects(
    sendExtensionRequest(
      { type: "ping" },
      {
        sendMessage: async () => failure("Background unavailable")
      }
    ),
    /Background unavailable/
  )
})

test("responds to asynchronous message handlers", async () => {
  const responses: unknown[] = []

  assert.equal(
    respondWith(
      (response) => responses.push(response),
      async () => "saved",
      "Save failed"
    ),
    true
  )

  await new Promise((resolve) => setImmediate(resolve))
  assert.deepEqual(responses, [success("saved")])
})
