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
pnpm dev
```

Load the generated development extension from:

```text
build/chrome-mv3-dev
```

## Production Build

```bash
pnpm build
```

Load or package the production extension from:

```text
build/chrome-mv3-prod
```

## Project Layout

- `src/popup.tsx` - whole-page clipping UI.
- `src/content.ts` - page and selection serialization to Markdown.
- `src/background.ts` - context menu setup, popup/context orchestration, and Chrome downloads.
- `src/tabs/offscreen.ts` - ZIP/Markdown Blob URL creation for MV3.
- `src/components/ui/button.tsx` - shadcn/ui button component.
