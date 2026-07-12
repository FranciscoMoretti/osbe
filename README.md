# OSBE

Open Source Browser Extensions is a monorepo for OSBE browser extensions and the future OSBE website.

OSBE builds small, transparent browser extensions that users can inspect, reason about, clone, and adapt. See [docs/brand.md](docs/brand.md) for the brand brief, messaging, and trust principles.

## Workspaces

- `extensions/markdown-clipper` - OSBE Markdown clipper built with Plasmo, Tailwind CSS, and shadcn/ui conventions.
- `extensions/site-blocker` - OSBE site blocker built with the same Plasmo, Tailwind CSS, and shadcn/ui conventions.
- `apps/website` - placeholder package for the future OSBE website.
- `packages/*` - reserved for shared packages when an extension or the website needs shared code.

## Development

Install dependencies from the repository root:

```bash
pnpm install
```

Run Markdown Clipper:

```bash
pnpm dev
```

or explicitly:

```bash
pnpm dev:markdown-clipper
```

Load the generated development extension from:

```text
extensions/markdown-clipper/build/chrome-mv3-dev
```

Run Site Blocker:

```bash
pnpm dev:site-blocker
```

Load the generated extension from:

```text
extensions/site-blocker/build/chrome-mv3-dev
```

## Build

Build every workspace that has a `build` script:

```bash
pnpm build
```

Build or package an extension directly:

```bash
pnpm build:markdown-clipper
pnpm package:markdown-clipper
pnpm build:site-blocker
pnpm package:site-blocker
```

## Create A New Extension

Use the scaffold script:

```bash
pnpm new:extension my-extension "OSBE My Extension"
pnpm install
pnpm --filter @osbe/my-extension dev
```

See `docs/create-extension.md` for the full checklist.
