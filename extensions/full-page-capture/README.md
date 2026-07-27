# OSBE Full Page Capture

Open Source Browser Extensions (OSBE) Full Page Capture is a user-invoked Chrome
MV3 extension that captures an entire webpage—not only the visible viewport—and
exports it as PNG or PDF. It is built on the shared OSBE Plasmo, Tailwind CSS,
and shadcn/ui foundation. Its
[source code](https://github.com/FranciscoMoretti/osbe/tree/main/extensions/full-page-capture)
is public and can be reviewed, built, or forked.

## How It Works

1. Open the page you want to capture.
2. Click the extension toolbar icon, or press `Alt+Shift+P` on Windows/Linux
   (`Control+Shift+P` on macOS).
3. Keep that tab active while the extension scrolls through the page.
4. A local result tab opens with the complete stitched preview.
5. Download the result as a lossless PNG or paginated PDF.

The extension temporarily disables page animations and smooth scrolling,
captures each viewport, avoids repeating fixed and sticky elements, restores
the original scroll position, and assembles the result in the extension page.
Pages beyond safe browser canvas limits are exported as numbered PNG parts in
one ZIP file; their PDF remains one document.

## Privacy

Capture starts only from an explicit toolbar click or keyboard shortcut. Page
pixels, title, URL, and dimensions are processed locally in memory. The
extension has no account, analytics, advertising, remote service, or stored
capture history. Nothing is transmitted to OSBE.

See [PRIVACY.md](PRIVACY.md) for the complete policy.

## Permissions

Single purpose: capture the full height of the current webpage and let the user
download the result as PNG or PDF.

`activeTab` justification:
Grants temporary access to the current page only after the user invokes the
extension. It permits visible-tab screenshots without persistent access to
browsing activity or every website.

`scripting` justification:
Runs temporary capture helpers in the invoked page to measure its height,
scroll between viewports, avoid duplicated fixed elements, and restore the
page afterward. The extension does not install a persistent content script.

Remote code:
No remote code is used. All capture, stitching, ZIP, and PDF code is included
in the extension package.

## Known Browser Limits

- Chrome does not allow extensions to capture internal pages, the Chrome Web
  Store, or other protected browser surfaces.
- The tab being captured must stay active until capture completes.
- Infinite-scrolling pages are capped at 200 viewports.
- Pages that animate or change while scrolling may produce different content
  between captured viewports.
- The capture uses the current viewport width and the page's complete vertical
  height.

## Development

```bash
pnpm install
pnpm extension dev full-page-capture
```

Load:

```text
extensions/full-page-capture/build/chrome-mv3-dev
```

Run the focused tests and production checks:

```bash
pnpm extension test full-page-capture
pnpm --filter @osbe/full-page-capture typecheck
pnpm extension validate full-page-capture
pnpm extension build full-page-capture
pnpm extension package full-page-capture
```

The Chrome Web Store ZIP is generated at:

```text
extensions/full-page-capture/build/chrome-mv3-prod.zip
```

## Shared OSBE Foundation

- Shared shadcn/ui primitives come from `@osbe/ui`.
- Shared Plasmo, TypeScript, Tailwind, and PostCSS policy comes from
  `@osbe/config`.
- `assets/icon-source.svg` is the canonical product icon; run
  `pnpm extension artwork full-page-capture` to regenerate runtime and store
  PNGs.
- The submission workflow delegates to the repository's reusable extension
  workflow.

## Extension Surfaces

- The background worker owns the toolbar action, scroll/capture cadence,
  temporary page scripting, and result-tab lifecycle.
- There is no popup; clicking the toolbar icon starts capture directly.
- Temporary page helpers are injected only for an invoked capture. There is no
  persistent content script.
- The result tab receives viewport images, assembles the preview, and performs
  local PNG, ZIP, and PDF exports.
- There is no offscreen document.
