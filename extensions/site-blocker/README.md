# OSBE Site Blocker

OSBE Site Blocker is a local-first Chrome MV3 extension for blocking distracting websites with dashboard-managed rules. It is built with Plasmo, Tailwind CSS, and shadcn/ui conventions like the other OSBE extensions.

## Features

- Blocking is active by default.
- Add, edit, delete, enable, and disable local block rules.
- Temporarily allow access for 5, 10, 15, or 30 minutes from the dashboard only.
- Pause all blocking globally from the dashboard.
- Popup shows current status and links to the dashboard. It does not include pause, disable, or override controls.
- Blocked page explains the block and links to the dashboard. It does not include override controls.

## Website Rules

Each rule is a hostname. It blocks every page on that hostname and all of its
subdomains:

```text
reddit.com
mail.google.com
```

When rules overlap, the most specific hostname wins. For example,
`mail.google.com` takes precedence over `google.com`, including its enabled,
disabled, and temporary override state.

Rules are stored in `chrome.storage.local`. Blocking requires no account,
analytics, remote sync, or OSBE service, and block rules are never sent to
OSBE. The optional official-build verification contacts `osbe.dev` only after
the user starts it.

## Development

```bash
pnpm install
pnpm dev:site-blocker
```

Load the generated extension from:

```text
extensions/site-blocker/build/chrome-mv3-dev
```

## Production Build

```bash
pnpm build:site-blocker
pnpm package:site-blocker
```

Load the production extension from:

```text
extensions/site-blocker/build/chrome-mv3-prod
```

The packaged Chrome Web Store ZIP is:

```text
extensions/site-blocker/build/chrome-mv3-prod.zip
```

## Permissions

Single purpose:
Block websites chosen by the user and manage temporary access to those websites from a local dashboard.

`declarativeNetRequest` justification:
Creates local dynamic rules that redirect top-level navigation for user-selected websites to the extension's local blocked page.

`host_permissions` justification:
The user can add any website to the block list. Access to all URLs lets Chrome redirect navigation for the exact domains and subdomains chosen by the user. The extension does not read page content or run content scripts.

`storage` justification:
Stores the block list, enabled states, temporary-access timers, global pause setting, and short-lived verification challenge in `chrome.storage.local`.

`alarms` justification:
Checks for expired temporary-access timers so blocking resumes automatically.

`activeTab` justification:
Reads the current tab URL only when the user opens the popup so it can show whether the current website matches an active local rule. The URL is not stored or transmitted.

`favicon` justification:
Displays Chrome's locally cached favicon beside each website in the dashboard so rules are easier to identify.

Web history disclosure:
Handles user-entered website hostnames and the active tab URL locally to apply blocking rules and show current-site status. This data stays in `chrome.storage.local` and is not transmitted to OSBE or third parties.

External connection disclosure:
Allows `osbe.dev` to verify an installed OSBE extension only after the user starts verification. The response contains the extension name, version, runtime ID, and a short-lived challenge; it does not include block rules, browsing activity, or settings.

Remote code:
No remote code is used.
