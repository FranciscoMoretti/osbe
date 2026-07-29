# OSBE Window Resizer

Resize the current Chrome window with one click using built-in device presets or
your own saved sizes.

## Features

- Six built-in defaults for mobile, tablet, laptop, and desktop testing
- Window and viewport resize targets on every preset
- Custom named width and height presets, prefilled from the selected target
- Edit, delete, and reorder controls inside the popup
- One-click reset back to the built-in defaults
- Local-only preset storage with no account, sync, analytics, or remote code

Window-targeted dimensions apply to the complete Chrome frame. Viewport-targeted
dimensions apply to the active page area; the extension measures the difference
between the viewport and outer frame, then compensates for that browser chrome
when resizing. Applying either target returns maximized or fullscreen windows to
their normal state so Chrome can use the requested bounds.

## Architecture and browser access

The extension is popup-only. It has no background service worker, persistent
content scripts, offscreen documents, or host permissions. The popup calls
Chrome's `windows` API when opened or when the user selects a preset.
Viewport-targeted presets use `activeTab` and `scripting` to run a small local
measurement function that reads only `window.innerWidth` and
`window.innerHeight` from the active page. `storage` keeps preset names,
dimensions, targets, and ordering in `chrome.storage.local`.

## Development

```bash
pnpm extension dev window-resizer
```

Load `extensions/window-resizer/build/chrome-mv3-dev` in Chrome.

## Artwork

`assets/icon-source.svg` is the source of truth for the toolbar and Chrome Web
Store icons. Regenerate the derived PNGs with:

```bash
pnpm extension assets window-resizer
```

## Verification and release

```bash
pnpm extension check window-resizer
pnpm extension smoke window-resizer
pnpm extension package window-resizer
```

The release workflow expects the repository secret named
`WINDOW_RESIZER_SUBMIT_KEYS`.
