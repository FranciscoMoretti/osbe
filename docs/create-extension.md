# Create A New Extension

OSBE extensions live in `extensions/*` as independent packages. Markdown Clipper uses Plasmo; Site Blocker uses React + Vite with a hand-authored MV3 manifest.

Use this document as the full extension checklist, not just the code scaffold. A publishable extension needs package metadata, an installable icon, Chrome Web Store assets, permission justifications, and a submission workflow.

## Generate The Package

From the repository root:

```bash
pnpm new:extension my-extension "OSBE My Extension"
```

The script currently creates a Plasmo-based package:

- `extensions/my-extension/package.json`
- Plasmo TypeScript config and shadcn/ui config
- Tailwind and PostCSS config
- `src/style.css`
- `src/popup.tsx`
- `src/lib/utils.ts`
- `src/components/ui/button.tsx`

The generated package is intentionally minimal. Before publishing, add the extension-specific files listed below.

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

## Package Metadata

Plasmo derives the built Chrome manifest from each extension's `package.json`. Chrome Web Store also surfaces some of this metadata directly:

- `displayName` becomes the extension title in the package and installed extension views.
- `description` becomes the package summary. Chrome Web Store shows this as "Summary from package" in the listing overview and currently rejects values longer than 132 characters.
- `version` becomes the submitted extension version. Every uploaded package must have a version greater than the currently published version.
- `manifest.permissions` must list every requested Chrome permission.

Set `package.json` `description` to a short feature-led summary, not the long store listing description. Keep it under 132 characters so it can be uploaded to Chrome Web Store.

Keep the long dashboard `Description` field in source control, usually at:

```text
extensions/my-extension/store-assets/chrome-web-store-listing.md
```

Chrome's dashboard `Description` field allows long listing copy, currently up to 16,000 characters. That copy should be feature-led and easy to paste into the store dashboard.

Example:

```json
{
  "displayName": "OSBE Markdown Clipper",
  "version": "0.0.2",
  "description": "One-click Markdown clipper. Save pages and selections as clean Markdown with preview, copy, and download.",
  "manifest": {
    "permissions": [
      "activeTab",
      "contextMenus",
      "downloads",
      "offscreen",
      "scripting"
    ]
  }
}
```

For the dashboard `Description` field, keep a separate Markdown file:

```markdown
# Chrome Web Store Listing

## Summary From Package

One-click Markdown clipper. Save pages and selections as clean Markdown with preview, copy, and download.

## Description

One-click Markdown web clipper for saving pages and selections as clean, portable Markdown.

Use feature sections and bullets here. This is the long store listing copy, not the manifest summary.
```

## Extension Icon

The installed extension icon comes from the packaged extension, not from Chrome Web Store artwork. Plasmo reads the source icon from:

```text
extensions/my-extension/assets/icon.png
```

Use a product-specific square PNG before building. If this is missing or still a placeholder, the installed extension can show the default Plasmo-style diamond icon in `chrome://extensions` and the browser toolbar.

After running a production build, inspect:

```text
extensions/my-extension/build/chrome-mv3-prod/manifest.json
```

Confirm the generated `icons` and `action.default_icon` entries are present and point to the generated `icon*.plasmo.*.png` files. Then load `extensions/my-extension/build/chrome-mv3-prod` locally and check the icon in `chrome://extensions`.

## shadcn/ui In Plasmo

Each extension keeps its own `components.json`, `tailwind.config.js`, `postcss.config.js`, and `src/style.css`, following the Plasmo shadcn example pattern. The default `~` alias maps to `src/*` through the extension's `tsconfig.json`.

To add more shadcn/ui components, run commands from the extension directory so generated files land in that extension:

```bash
cd extensions/my-extension
pnpm dlx shadcn@latest add dialog
```

## Store Assets

Chrome Web Store artwork is separate from the runtime extension icon. Keep it in the extension directory:

```text
extensions/my-extension/store-assets/
```

Use `extensions/markdown-clipper/store-assets` as the current reference structure:

```text
store-assets/
  README.md
  chrome-web-store-listing.md
  store-icon-128.png
  small-promo-440x280.png
  screenshots/
    screenshot-1-*.png
    screenshot-2-*.png
    screenshot-3-*.png
```

The Markdown Clipper assets are generated by:

```bash
pnpm --filter @osbe/markdown-clipper generate:store-assets
```

For a new extension, add an equivalent extension-specific generator or create the files manually. Screenshots should show the real product workflow, not generic marketing art. If screenshots are generated from SVG or another source format, export them as 1280x800 PNGs without alpha; Chrome Web Store rejects or degrades some transparent screenshot assets.

## Chrome Web Store Listing

Create the first listing manually in the Chrome Web Store Developer Dashboard so the extension receives a store extension ID. Fill the listing using package metadata and extension-specific content:

- Title from package: comes from `displayName`.
- Summary from package: comes from `package.json` `description`; keep this under 132 characters.
- Description: dashboard field; copy the long listing copy from `store-assets/chrome-web-store-listing.md`.
- Category: choose the narrowest accurate category.
- Store icon: upload `store-assets/store-icon-128.png`.
- Screenshots: upload the files under `store-assets/screenshots/`.
- Promotional image: upload `store-assets/small-promo-440x280.png` when available.

The package summary and dashboard description appear together in the listing overview. Treat them as a pair, but keep them in separate places:

```text
Summary from package:
One-click Markdown clipper. Save pages and selections as clean Markdown with preview, copy, and download.

Description:
Copy from store-assets/chrome-web-store-listing.md
```

Before packaging, check the generated production manifest:

```bash
pnpm --filter @osbe/my-extension build
node -e "const m=require('./extensions/my-extension/build/chrome-mv3-prod/manifest.json'); console.log(m.version, m.description.length, m.description)"
```

Confirm the version is greater than the published Chrome Web Store version and the description length is 132 characters or less.

## Permission Justifications

Chrome Web Store requires a single-purpose description and one justification per requested permission. Keep these in source control with the extension so future updates do not depend on dashboard memory.

Use this pattern:

```text
Single purpose:
<one sentence describing the narrow job the extension performs>

<permission> justification:
<why the extension needs this permission, when it uses it, and why a narrower alternative does not work>
```

Markdown Clipper currently uses:

```text
Single purpose:
Clip pages and selections into Markdown

activeTab justification:
Temporarily accesses the current tab only after the user clicks the extension or selects an extension context menu action. This access is needed to read the page or selected content and convert it to Markdown.

contextMenus justification:
Adds right-click actions so users can clip selected webpage content as Markdown.

downloads justification:
Saves user-requested Markdown files or ZIP files containing Markdown and local image assets.

offscreen justification:
Creates Blob URLs for Markdown and ZIP downloads because Manifest V3 service workers cannot create DOM Blob object URLs.

scripting justification:
Runs the Markdown clipping script only after the user invokes the extension on the current tab. The script reads the current page or selection, converts it to Markdown, and does not run persistently.

Remote code:
No, I am not using remote code.
```

Avoid broad host permissions unless the extension cannot work without them. OSBE extensions should prefer user-invoked access such as `activeTab` where possible.

## Build And Package

Publishing is per extension. Create a workflow or update an existing one to build and package the target workspace:

```bash
pnpm --filter @osbe/my-extension build
pnpm --filter @osbe/my-extension package
```

Before running `package`, update `package.json` `version` to a value greater than the currently published store version. Chrome Web Store rejects ZIPs whose generated `manifest.json` version is not greater than the published package.

The packaged ZIP will be under:

```text
extensions/my-extension/build/
```

Before uploading, load the production build locally:

```text
extensions/my-extension/build/chrome-mv3-prod
```

Check the popup, context menus, download flow, permissions, and icon. Then upload the ZIP from:

```text
extensions/my-extension/build/chrome-mv3-prod.zip
```

## Automated Submission With BPP

The repository can use [Plasmo Browser Platform Publisher](https://github.com/PlasmoHQ/bpp) to submit packaged extension ZIPs from GitHub Actions. BPP can automate uploading the package to supported browser stores, but it does not replace the store listing content, screenshots, privacy answers, or permission justifications.

For Chrome, create a non-secret template in the extension directory:

```json
{
  "$schema": "https://github.com/PlasmoHQ/bpp/raw/main/keys.schema.json",
  "chrome": {
    "clientId": "YOUR_GOOGLE_OAUTH_CLIENT_ID",
    "clientSecret": "YOUR_GOOGLE_OAUTH_CLIENT_SECRET",
    "refreshToken": "YOUR_GOOGLE_OAUTH_REFRESH_TOKEN",
    "extId": "YOUR_CHROME_WEB_STORE_EXTENSION_ID"
  }
}
```

Commit only the template, for example:

```text
extensions/my-extension/submit-keys.example.json
```

Store the real JSON in a GitHub Actions secret such as `SUBMIT_KEYS`.

The current Markdown Clipper workflow is `.github/workflows/submit.yml`. A new extension needs either a new workflow job or a parameterized workflow that builds that package and passes the produced ZIP to BPP:

```yaml
- name: Browser Platform Publish
  uses: PlasmoHQ/bpp@v3
  with:
    keys: ${{ secrets.SUBMIT_KEYS }}
    artifact: extensions/my-extension/build/chrome-mv3-prod.zip
```

Use one secret per target listing if multiple extensions are submitted from the same repository.

## Release Checklist

- `package.json` has final `displayName`, `description`, `version`, and `manifest.permissions`.
- `package.json` `description` is the short summary from package and is 132 characters or less.
- `package.json` `version` is greater than the currently published Chrome Web Store version.
- `assets/icon.png` is a final product icon and the production build shows it in `chrome://extensions`.
- `store-assets/` contains the listing icon, screenshots, and promotional image.
- `store-assets/chrome-web-store-listing.md` contains the long dashboard description copy.
- Dashboard description, single purpose, permission justifications, and remote-code answer are recorded in source control.
- `pnpm --filter @osbe/my-extension build` succeeds.
- `pnpm --filter @osbe/my-extension package` produces `build/chrome-mv3-prod.zip`.
- The generated production `manifest.json` has the expected version and summary length.
- The production build has been loaded locally and checked before submission.
- BPP keys are stored only in GitHub Secrets, never committed.
