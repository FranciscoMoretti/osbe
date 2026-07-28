<p align="center">
  <img src="docs/assets/osbe-logo-official.png" alt="OSBE icon" width="128" height="128">
</p>

# OSBE

Open Source Browser Extensions is a monorepo for OSBE browser extensions.

OSBE builds small, transparent browser extensions that users can inspect, reason about, clone, and adapt. This GitHub repository and README are the public source of truth for OSBE; there is no separate project website. See [docs/brand.md](docs/brand.md) for the brand brief, messaging, and trust principles.

## Workspaces

- `extensions/markdown-clipper` - OSBE Markdown clipper built with Plasmo, Tailwind CSS, and shadcn/ui conventions.
- `extensions/site-blocker` - OSBE site blocker built with the same Plasmo, Tailwind CSS, and shadcn/ui conventions.
- `extensions/full-page-capture` - OSBE full-page PNG and PDF capture extension built on the same shared foundation.
- `packages/ui` - shared OSBE theme, utility, and shadcn/ui source components.
- `packages/config` - shared Plasmo TypeScript, Tailwind, and PostCSS policy.
- `packages/extension-kit` - typed messaging, storage, tab, and scripting helpers shared by extension runtimes.
- `extensions/*/extension.config.json` - discoverable product, store, permission, release, and smoke-test metadata.

## Development

Install dependencies from the repository root:

```bash
pnpm install
```

List extensions:

```bash
pnpm extension list
```

Run an extension:

```bash
pnpm extension dev markdown-clipper
pnpm extension dev site-blocker
pnpm extension dev full-page-capture
```

Load the generated development extension from:

```text
extensions/markdown-clipper/build/chrome-mv3-dev
```

## Build

Build every workspace that has a `build` script:

```bash
pnpm build
```

Build, verify, or package one extension:

```bash
pnpm extension check markdown-clipper
pnpm extension smoke markdown-clipper
pnpm extension build markdown-clipper
pnpm extension package markdown-clipper
pnpm extension publish markdown-clipper
```

Validate release structure, run tests, typecheck, and build everything:

```bash
pnpm check
```

## Create A New Extension

Use the scaffold script:

```bash
pnpm new:extension my-extension "OSBE My Extension"
pnpm new:extension page-tool "OSBE Page Tool" --surface action-result
pnpm new:extension settings-tool "OSBE Settings Tool" --surface dashboard
pnpm install
pnpm extension dev my-extension
```

Extensions are discovered from their local metadata, so there is no registry to
edit. The generator creates the selected branded UI surface, runtime/store
baseline, and a thin workflow that uses the shared submission workflow. See
`docs/create-extension.md` for the product-specific release checklist.
