# Create an OSBE Extension

OSBE extensions are catalogued Plasmo packages that consume shared brand UI and build policy. Creating another extension should add product behavior, artwork, copy, and permissions—not another copy of the toolchain.

## Generate the extension

From the repository root:

```bash
pnpm new:extension link-cleaner "OSBE Link Cleaner"
pnpm install
pnpm extension dev link-cleaner
```

The generator creates and registers:

- a Plasmo package under `extensions/link-cleaner`;
- shared `@osbe/ui` and `@osbe/config` dependencies;
- a popup using the shared OSBE theme and Button;
- runtime and temporary store icons based on the OSBE base icon;
- README, privacy, listing, permission, and submission-key templates;
- a Chrome Web Store workflow backed by the reusable submission workflow;
- an entry in `extensions/catalog.json`.

It intentionally requests no browser permissions. Add only the capabilities the product actually needs.

## Extension commands

Commands resolve packages through `extensions/catalog.json`; adding an extension does not add root package scripts.

```bash
pnpm extension list
pnpm extension dev link-cleaner
pnpm extension build link-cleaner
pnpm extension package link-cleaner
pnpm extension publish link-cleaner
pnpm extension test link-cleaner
pnpm extension validate link-cleaner
```

The `test` command runs product tests when that extension defines them; a newly generated extension has no placeholder test suite.

Run the complete repository check with:

```bash
pnpm check
```

## Shared UI ownership

Canonical shadcn/ui source components live in `packages/ui/src/components`. Extensions import them directly:

```tsx
import { Button } from "@osbe/ui/components/button"
```

The repository currently uses Tailwind CSS v3. Run the Tailwind-v3-compatible shadcn CLI from an extension directory. Its `components.json` routes UI primitives and utilities to `packages/ui`, while product-specific modules remain in the extension.

```bash
cd extensions/link-cleaner
pnpm dlx shadcn@2.3.0 add dialog
```

Do not create local copies of shared primitives. Extend their variants centrally or compose them into product-specific modules locally.

The shared theme is `packages/ui/src/styles/theme.css`. Product CSS belongs in the extension and imports that theme. Shared Tailwind, PostCSS, and Plasmo TypeScript policy lives in `packages/config`.

## Product work required before release

The generated extension is a working branded development baseline. A real product still needs:

- product behavior and product-specific modules;
- a final product icon at `assets/icon.png`;
- a 128×128 store icon and real 1280×800 screenshots;
- feature-led store copy;
- a precise privacy policy;
- permission and host-permission justifications;
- focused tests for valuable product seams.

`pnpm extension validate <slug>` checks the release structure and rejects incomplete store assets such as a missing screenshot.

## Metadata and permissions

Plasmo builds the manifest from the extension `package.json`.

- `displayName` must follow `OSBE [Function]`.
- `description` is the Chrome package summary and must be 132 characters or fewer.
- `version` must be greater than the version already published.
- `manifest.permissions` must be explicit, even when empty.
- Broad host permissions require a product-specific justification.

Prefer user-invoked capabilities such as `activeTab` when they can support the product. Record one justification per permission in the extension README and store listing.

## Icons and store assets

Plasmo reads the installed extension icon from:

```text
extensions/link-cleaner/assets/icon.png
```

Every extension also owns one editable source:

```text
extensions/link-cleaner/assets/icon-source.svg
```

The scaffold starts with the neutral OSBE mark. Replace only its inner symbol
with a product-specific mark, then generate both required PNGs together:

```bash
pnpm extension artwork link-cleaner
```

Chrome Web Store artwork is separate:

```text
store-assets/
  README.md
  chrome-web-store-listing.md
  store-icon-128.png
  screenshots/
```

The artwork command renders `icon.png` and `store-icon-128.png` from the same
canonical SVG, so those surfaces cannot drift. Keep the pale tile, border,
padding, navy functional ink, and transparent corners. Prefer one primary
symbol; when a second concept is essential, use one simple functional badge at
least one quarter of the tile height. Avoid colored underlays, decorative
shadows, and details that disappear at `16px`. Screenshots should show the real
workflow and contain no alpha channel.

## Validation and packaging

Before submission:

```bash
pnpm extension validate link-cleaner
pnpm extension build link-cleaner
pnpm extension package link-cleaner
```

Inspect `build/chrome-mv3-prod/manifest.json`, then load `build/chrome-mv3-prod` locally. Confirm the popup, icon, requested permissions, background behavior, and product workflow.

## Automated Chrome submission

Each extension has a small caller workflow. Build, validation, packaging, and upload behavior live once in `.github/workflows/_submit-extension.yml`.

The generated workflow expects a repository secret named from the slug, for example:

```text
LINK_CLEANER_SUBMIT_KEYS
```

Use `submit-keys.example.json` as the shape of that secret. Never commit real credentials.

The shared workflow submits code packages only. Chrome Web Store listing content, screenshots, privacy answers, and permission declarations still need to be completed in the Developer Dashboard.

## Release checklist

- Final single-purpose behavior is implemented.
- Permissions are minimal and justified.
- Package summary is 1–132 characters.
- Version exceeds the published version.
- Runtime and store icons are product-specific.
- Runtime and store icons were regenerated from `assets/icon-source.svg`.
- The icon remains recognizable at `16px`, `24px`, and `32px`.
- At least one real 1280×800 screenshot is present.
- Store listing and privacy copy are final.
- `pnpm extension validate <slug>` passes.
- Product tests pass.
- Production build and package succeed.
- The unpacked production extension has been checked in Chrome.
