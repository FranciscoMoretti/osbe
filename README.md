# OSBE

Open Source Browser Extensions is a monorepo for OSBE browser extensions and the future OSBE website.

OSBE builds small, transparent browser extensions that users can inspect, reason about, clone, and adapt. See [docs/brand.md](docs/brand.md) for the brand brief, messaging, and trust principles.

## Workspaces

- `extensions/markdown-clipper` - OSBE Markdown clipper built with Plasmo, Tailwind CSS, and shadcn/ui conventions.
- `extensions/site-blocker` - OSBE site blocker built with the same Plasmo, Tailwind CSS, and shadcn/ui conventions.
- `apps/website` - placeholder package for the future OSBE website.
- `packages/ui` - shared OSBE theme, utility, and shadcn/ui source components.
- `packages/config` - shared Plasmo TypeScript, Tailwind, and PostCSS policy.
- `extensions/catalog.json` - registry used by extension commands and validation.

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

Build or package one extension through the catalog:

```bash
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
pnpm install
pnpm extension dev my-extension
```

The generator registers the package, creates the branded runtime/store baseline,
and adds a thin workflow that uses the shared submission workflow. See
`docs/create-extension.md` for the product-specific release checklist.
