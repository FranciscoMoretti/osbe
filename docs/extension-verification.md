# OSBE Extension Verification

OSBE extensions can prove that a user is talking to the official published build by using Chrome's extension ID boundary instead of a reusable secret.

Do not embed a long-lived secret token in an extension. OSBE extensions are open source and browser extension packages can be inspected, so any bundled bearer token can be copied by a fork or copycat extension.

## Verification Model

The production OSBE website keeps a registry of official Chrome Web Store extension IDs. Chrome routes external messages to the extension with the exact requested ID, so another extension cannot answer for the official ID unless it was signed/published with the same extension key.

The installed extension also issues a short-lived challenge before opening the OSBE verification page:

1. User clicks `Verify official build` in the extension popup.
2. The extension generates a 32-byte random challenge, stores it locally for five minutes, and opens:

   ```text
   https://osbe.dev/verify-extension?extension=<slug>&challenge=<challenge>
   ```

3. The OSBE page looks up the official extension ID for `<slug>`.
4. The page sends `osbe/extension:verify` to that exact extension ID with the challenge.
5. The extension responds only if the sender is `https://osbe.dev` or `https://www.osbe.dev` and the stored challenge matches.
6. The page accepts the result only when the response echoes the challenge, product slug, runtime ID, and version.

This prevents a copycat extension from creating a convincing OSBE verification link. It can copy the code and generate its own challenge, but it cannot receive messages sent to the official OSBE extension ID or read the official extension's stored challenge.

## Extension Requirements

Each extension manifest must allow only OSBE origins to send external messages:

```json
{
  "manifest": {
    "externally_connectable": {
      "matches": ["https://osbe.dev/*", "https://www.osbe.dev/*"]
    }
  }
}
```

Each background service worker must register an `onMessageExternal` handler for:

```text
osbe/extension:verify
```

The handler must:

- reject non-OSBE sender origins,
- reject messages for another extension slug,
- reject missing, malformed, expired, or already-used challenges,
- return the runtime ID from `chrome.runtime.id`, and
- return the package version from `chrome.runtime.getManifest().version`.

## Website Requirements

The OSBE website verifier lives at:

```text
apps/website/src/extension-verification.ts
```

Before launching the verification page, replace the placeholder IDs in `OSBE_EXTENSION_REGISTRY` with the public Chrome Web Store IDs:

```ts
export const OSBE_EXTENSION_REGISTRY = {
  "markdown-clipper": {
    chromeWebStoreId: "<official Chrome Web Store ID>",
    displayName: "OSBE Markdown Clipper",
    slug: "markdown-clipper"
  }
}
```

The website should fail closed if an extension ID is missing, if `chrome.runtime.sendMessage` is unavailable, or if the response runtime ID does not exactly match the registry.

## Limits

This verifies the installed extension identity, not that a user installed from a particular page. Users can still self-build or fork OSBE extensions, but those builds will have different extension IDs and should be shown as unofficial/self-built unless their ID is explicitly registered by OSBE.

This also does not replace Chrome Web Store publisher verification, source review, permission review, or reproducible build documentation. It is one user-facing authenticity check.
