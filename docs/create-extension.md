# Create an OSBE Extension

OSBE extensions are self-describing Plasmo packages built on shared runtime,
UI, configuration, store-asset, and release foundations. A new extension should
mostly contain its product behavior, product copy, and product artwork.

## Choose a surface

Generate the closest starting shape:

```bash
# Compact toolbar experience (default)
pnpm new:extension link-cleaner "OSBE Link Cleaner" --surface popup

# Toolbar click starts work and opens a result tab
pnpm new:extension page-archive "OSBE Page Archive" --surface action-result

# Compact popup plus a full options dashboard
pnpm new:extension tab-manager "OSBE Tab Manager" --surface dashboard
```

Then install once at the repository root and start the extension:

```bash
pnpm install
pnpm extension dev link-cleaner
```

The generator creates:

- a package under `extensions/<slug>`;
- the selected branded surface using `@osbe/ui`;
- `@osbe/extension-kit` and shared build-policy dependencies;
- `extension.config.json`, which makes the package discoverable automatically;
- neutral runtime and store icons from the same SVG source;
- privacy, listing, screenshot, and submission-key templates;
- a thin Chrome Web Store workflow backed by the reusable workflow.

It requests no permissions for popup or dashboard extensions. The
action-result archetype starts with `activeTab` and a placeholder justification.
Keep only capabilities required by the product.

## What is shared

Use `@osbe/ui` for shadcn primitives, the OSBE theme, and the branded shells:

```tsx
import { Button } from "@osbe/ui/components/button"
import {
  ExtensionPageHeader,
  PopupShell,
  StatusPanel
} from "@osbe/ui/components/extension-shell"
```

Use `@osbe/extension-kit` rather than rewriting Chrome API plumbing:

```ts
import {
  failure,
  respondWith,
  sendExtensionRequest,
  success
} from "@osbe/extension-kit/messaging"
import {
  createBrowserStorageAdapter,
  createStoredState
} from "@osbe/extension-kit/storage"
import {
  executeInTab,
  getActiveTab,
  openOptionsPage
} from "@osbe/extension-kit/tabs"
```

Shared Tailwind, PostCSS, and TypeScript policy lives in `packages/config`.
Product-specific components and behavior stay in the extension.

Canonical shadcn source components live in `packages/ui/src/components`. Add
them from the shared package so both source and dependencies have one owner:

```bash
pnpm dlx shadcn@2.3.0 add dialog --cwd packages/ui
```

Extension `components.json` and TypeScript aliases also resolve `@osbe/ui`
directly to that source for shadcn tooling. Do not keep a local
`src/components/ui` copy. Extend shared variants centrally or compose shared
primitives into a product component locally.

## Metadata is the source of truth

Each extension owns `extension.config.json`. It contains:

- identity and surface archetype;
- package summary and single purpose;
- permissions, host permissions, and their store justifications;
- handled data categories and remote-code declaration;
- current Chrome Web Store category, full description, support/privacy URLs,
  visibility, assets, review instructions, and optional store ID;
- release workflow and secret name;
- the extension page used by automated Chrome smoke tests.

The extension CLI discovers these files directly. `package.json` and manifest
permissions must match the definition. The copy-ready
`store-assets/chrome-web-store-listing.md` dossier is generated from the same
definition, and validation rejects manual edits or stale output:

```bash
pnpm extension store-dossier link-cleaner
```

Chrome's current categories are grouped around Communication, Developer Tools,
Education, Tools, Workflow & Planning, lifestyle categories, Accessibility,
Functionality & UI, and Privacy & Security. The schema rejects retired category
names such as `Productivity`.

## Day-to-day commands

```bash
pnpm extension list
pnpm extension dev link-cleaner
pnpm extension test link-cleaner
pnpm extension typecheck link-cleaner
pnpm extension build link-cleaner
pnpm extension check link-cleaner
pnpm extension store-dossier link-cleaner
pnpm extension store-preflight link-cleaner
```

`check` validates metadata and assets, runs product tests and typechecking, and
builds production output. New extensions need focused tests only where a
behavioral seam is valuable.

Run the full repository check with:

```bash
pnpm check
```

## Icons and store assets

Edit the single icon source:

```text
extensions/link-cleaner/assets/icon-source.svg
```

Keep the OSBE tile geometry and make the product symbol legible at 16px. Then
render both runtime and 128px store icons:

```bash
pnpm extension assets link-cleaner
```

Store screenshots may either be committed final PNGs or declare a raw `source`
in `extension.config.json`. The shared asset pipeline frames declared sources as
1280×800, removes alpha, and validates every committed screenshot. Promotional
tiles declare `kind: "small"` (440×280) or `"marquee"` (1400×560).

`assets` also refreshes the generated store dossier so artwork and submission
copy remain synchronized.

## Browser verification

Build and load the production extension in a clean headless Chrome profile:

```bash
pnpm extension smoke link-cleaner
```

The smoke page comes from `extension.config.json`, so popup, action-result, and
dashboard extensions all use the same command. This confirms that Chrome accepts
the manifest and can open the product's primary extension surface. Manually test
the main user workflow when it depends on live page interaction.

## Release

Prepare a versioned package:

```bash
pnpm extension release link-cleaner --patch
```

This validates, tests, typechecks, bumps the package version, builds, packages,
and prints the ZIP checksum. Use `--minor` or `--major` when appropriate. Preview
the version change without writing files:

```bash
pnpm extension release link-cleaner --patch --dry-run
```

Inspect local release state with:

```bash
pnpm extension status link-cleaner
```

After the version bump is committed and merged, trigger the extension's
submission workflow:

```bash
pnpm extension publish link-cleaner
```

The generated workflow expects `<SLUG>_SUBMIT_KEYS`; use
`submit-keys.example.json` for its shape and never commit credentials.

Before opening the dashboard or triggering an update, run:

```bash
pnpm extension store-preflight link-cleaner
```

The preflight checks schema and manifest parity, generated dossier freshness,
asset dimensions and alpha rules, package presence, the canonical public GitHub
privacy-policy URL, and whether a store ID has been assigned. It also opens the
ZIP manifest and compares its version, permissions, and host permissions with
the current package metadata. Use `--offline` only when network access is
intentionally unavailable.

### First submission

Chrome assigns an item ID only after its first package is created in the
Developer Dashboard. For a new extension:

1. Merge the extension and privacy policy to `main`.
2. Prepare and package the release.
3. Run `store-preflight`; it will identify the first-submission path.
4. Create the item in the OSBE publisher dashboard and copy values from the
   generated dossier.
5. Persist Chrome's assigned ID:

   ```bash
   pnpm extension store-id link-cleaner <32-character-store-id>
   ```

6. Commit the ID and regenerated dossier, and configure the workflow secret
   using the same ID.

Later releases use the reusable workflow. It now rejects a secret whose
`chrome.extId` does not match the committed `store.storeId`.

After every submission, verify the item reaches `Published`. New extensions
default to automatic publication after approval; if that setting is disabled,
publish the staged item within Chrome's 30-day window.

## Release checklist

- The single-purpose behavior is complete.
- Permissions are minimal and each has a precise justification.
- The package summary is 1–132 characters.
- The version exceeds the published version.
- The product icon is recognizable at 16px, 24px, and 32px.
- Runtime and store icons were regenerated from `assets/icon-source.svg`.
- At least one real screenshot is present and contains no alpha channel.
- Store description, review instructions, current category, support links, and
  privacy disclosures are complete in `extension.config.json`.
- `pnpm extension store-dossier <slug>` has refreshed the generated dossier.
- `pnpm extension check <slug>` passes.
- `pnpm extension smoke <slug>` loads the production extension in Chrome.
- The main product workflow has received a focused manual check.
- `pnpm extension package <slug>` produces the expected ZIP.
- `pnpm extension store-preflight <slug>` passes, including the public privacy
  policy check.
- The assigned store ID is committed after the first manual submission.
