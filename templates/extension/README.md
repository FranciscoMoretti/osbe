# {{displayName}}

An OSBE browser extension built with the shared Plasmo, Tailwind CSS, and shadcn/ui foundation.

## Development

```bash
pnpm extension dev {{slug}}
```

Load `extensions/{{slug}}/build/chrome-mv3-dev` in Chrome.

## Release preparation

Before publishing, replace the base OSBE icon with a product-specific icon, document every permission in this README and `PRIVACY.md`, replace the placeholder store copy and screenshots, then run:

```bash
pnpm extension validate {{slug}}
pnpm extension build {{slug}}
pnpm extension package {{slug}}
```
