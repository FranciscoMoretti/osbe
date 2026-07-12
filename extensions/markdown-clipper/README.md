# OSBE Markdown Clipper

An Open Source Browser Extension Chrome MV3 extension built with [Plasmo](https://docs.plasmo.com/), Tailwind CSS, and shadcn/ui conventions.

## Features

- Clip the active tab from the extension popup.
- Clip the current text/content selection from the page context menu.
- Convert HTML to Markdown with fenced code blocks and best-effort language detection from common `language-*` / `lang-*` classes.
- Include images by default. Image clips download as a ZIP containing the Markdown file and local `assets/` image files.
- Use an offscreen extension document for Blob URL creation, which avoids MV3 service worker download limitations.

## Development

```bash
pnpm install
pnpm extension dev markdown-clipper
```

Load the generated development extension from:

```text
extensions/markdown-clipper/build/chrome-mv3-dev
```

## Production Build

```bash
pnpm extension build markdown-clipper
```

Load or package the production extension from:

```text
extensions/markdown-clipper/build/chrome-mv3-prod
```

## Chrome Web Store Submission

The GitHub Actions workflow in `.github/workflows/submit.yml` uses `PlasmoHQ/bpp@v3` and expects a GitHub Actions secret named `SUBMIT_KEYS`.

For Chrome, that secret must include the Chrome Web Store extension ID:

```json
{
  "$schema": "https://github.com/PlasmoHQ/bpp/raw/main/keys.schema.json",
  "chrome": {
    "clientId": "YOUR_GOOGLE_OAUTH_CLIENT_ID",
    "clientSecret": "YOUR_GOOGLE_OAUTH_CLIENT_SECRET",
    "refreshToken": "YOUR_GOOGLE_OAUTH_REFRESH_TOKEN",
    "extId": "YOUR_CHROME_WEB_STORE_EXTENSION_ID"
  }
}
```

The `extId` is the ID from the extension's Chrome Web Store dashboard URL. The first upload usually needs to be created in the Chrome Web Store dashboard so the listing has an ID; after that, BPP can update the existing listing.

`extensions/markdown-clipper/submit-keys.example.json` is a non-secret template. Do not commit the real key file.

The extension uses user-invoked access through `activeTab` and does not declare broad host permissions. Use these Chrome Web Store privacy justifications:

```text
activeTab:
Temporarily accesses the current tab only after the user clicks the extension or selects an extension context menu action, so the page can be converted to Markdown.

contextMenus:
Adds right-click actions so users can clip selected webpage content as Markdown.

downloads:
Saves user-requested Markdown files or ZIP files containing Markdown and local image assets.

offscreen:
Creates Blob URLs for Markdown and ZIP downloads because Manifest V3 service workers cannot create DOM Blob object URLs.

scripting:
Runs the Markdown clipping script only after the user invokes the extension on the current tab.

storage:
Stores the user's Images and Template clipping preferences so popup and context menu actions use the same options.
```

## Project Layout

- `src/popup.tsx` - whole-page clipping UI.
- `src/lib/request-clip.ts` - user-invoked page and selection serialization to Markdown.
- `src/background.ts` - context menu setup, popup/context orchestration, and Chrome downloads.
- `src/tabs/offscreen.ts` - ZIP/Markdown Blob URL creation for MV3.
- `packages/ui` - shared OSBE theme and shadcn/ui primitives.
- `store-assets/` - Chrome Web Store artwork for this extension.
