# OSBE YouTube Shorts Remover

An automatic, open-source YouTube content filter built with the shared OSBE
Plasmo foundation.

It has no popup, options page, account, or settings. While enabled, it:

- removes Shorts from YouTube navigation;
- hides Shorts shelves and cards in feeds and search results;
- hides Shorts recommendations and channel tabs;
- redirects direct Shorts routes away from the Shorts viewer.

The content script runs only on `https://www.youtube.com/*`.

## Development

```bash
pnpm extension dev youtube-shorts-remover
```

Load `extensions/youtube-shorts-remover/build/chrome-mv3-dev` in Chrome.

## Verification

```bash
pnpm extension test youtube-shorts-remover
pnpm extension check youtube-shorts-remover
CHROME_PATH="/path/to/Google Chrome for Testing" \
  node scripts/verify-youtube-shorts-remover.mjs
```

## Artwork

`assets/icon-source.svg` is the single source for the toolbar and Chrome Web
Store icons. It uses a short-form video card crossed by the OSBE coral removal
mark. Regenerate both PNGs with:

```bash
pnpm extension assets youtube-shorts-remover
```

## Release preparation

```bash
pnpm extension check youtube-shorts-remover
pnpm extension smoke youtube-shorts-remover
pnpm extension package youtube-shorts-remover
pnpm extension store-preflight youtube-shorts-remover
```
