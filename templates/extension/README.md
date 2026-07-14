# {{displayName}}

An OSBE browser extension built with the shared Plasmo, Tailwind CSS, and shadcn/ui foundation.

## Development

```bash
pnpm extension dev {{slug}}
```

Load `extensions/{{slug}}/build/chrome-mv3-dev` in Chrome.

## Artwork

`assets/icon-source.svg` is the single source for the toolbar and Chrome Web
Store icons. Replace its neutral inner mark with the product symbol, retain the
OSBE tile geometry, and regenerate both PNGs with:

```bash
pnpm extension artwork {{slug}}
```

Use one dominant symbol. Add at most one simple functional badge when a second
concept is essential, keep it large enough to read at `16px`, and avoid colored
underlays or decorative shadows.

## Release preparation

Before publishing, replace the neutral inner icon with a product-specific mark,
regenerate the artwork, document every permission in this README and
`PRIVACY.md`, replace the placeholder store copy and screenshots, then run:

```bash
pnpm extension validate {{slug}}
pnpm extension build {{slug}}
pnpm extension package {{slug}}
```
