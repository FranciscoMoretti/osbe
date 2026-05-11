# Create A New Extension

OSBE extensions live in `extensions/*` as independent Plasmo packages. The first extension is `extensions/markdown-clipper`.

## Generate The Package

From the repository root:

```bash
pnpm new:extension my-extension "OSBE My Extension"
```

The script creates:

- `extensions/my-extension/package.json`
- Plasmo TypeScript config and shadcn/ui config
- Tailwind and PostCSS config
- `src/style.css`
- `src/popup.tsx`
- `src/lib/utils.ts`
- `src/components/ui/button.tsx`

## Install And Run

```bash
pnpm install
pnpm --filter @osbe/my-extension dev
```

Load the generated development extension from:

```text
extensions/my-extension/build/chrome-mv3-dev
```

## Naming

- Directory name: kebab case, for example `my-extension`.
- Package name: `@osbe/my-extension`.
- Display name: `OSBE My Extension`.
- Keep each extension's assets, store submission files, and generated store artwork inside its own extension directory.

## shadcn/ui In Plasmo

Each extension keeps its own `components.json`, `tailwind.config.js`, `postcss.config.js`, and `src/style.css`, following the Plasmo shadcn example pattern. The default `~` alias maps to `src/*` through the extension's `tsconfig.json`.

To add more shadcn/ui components, run commands from the extension directory so generated files land in that extension:

```bash
cd extensions/my-extension
pnpm dlx shadcn@latest add dialog
```

## Publishing

Publishing is per extension. Create a workflow or update an existing one to build and package the target workspace:

```bash
pnpm --filter @osbe/my-extension build
pnpm --filter @osbe/my-extension package
```

The packaged ZIP will be under:

```text
extensions/my-extension/build/
```
