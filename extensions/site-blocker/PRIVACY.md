# OSBE Site Blocker Privacy Policy

Last updated: July 11, 2026

OSBE Site Blocker blocks websites selected by the user. It is designed to work
locally without an account, analytics, advertising, or remote sync.

## Information Handled By The Extension

OSBE Site Blocker handles:

- Website hostnames the user adds to the block list.
- Rule settings, including enabled states, temporary-access timers, and the
  global pause setting.
- Top-frame navigation URLs, so the extension can enforce the block list even
  for restored, cached, or client-side navigations. The popup also uses the
  active tab URL to show whether that website is currently blocked.
- A short-lived random challenge when the user starts optional official-build
  verification.

The extension does not read website page content.

## How Information Is Used

Website hostnames and rule settings are used only to create and manage the
blocking rules requested by the user. When the dashboard is open, the extension
may also request `/favicon.ico` from a listed website so its icon can be shown.
Navigation URLs are compared locally with the block list and are not stored.

## Storage

The block list, rule settings, and verification challenge are stored in the
user's Chrome profile with `chrome.storage.local`. Navigation URLs are not
stored.

Users can delete individual rules in the dashboard. All extension data is also
removed when the user clears the extension's storage or uninstalls the
extension.

## Transmission And Sharing

OSBE Site Blocker does not transmit the block list, rule settings, active tab
URL, or browsing activity to OSBE or a centralized favicon service. To display
icons that are missing from Chrome's local favicon cache, the dashboard may
request `/favicon.ico` directly from the corresponding listed website. These
requests use a no-referrer policy and disclose only the normal network metadata
associated with requesting that icon.

OSBE Site Blocker does not sell user data, share it for advertising, or use it
for creditworthiness, lending, profiling, or purposes unrelated to website
blocking.

## Remote Code

The extension does not use remote code. All executable code is included in the
Chrome Web Store package.

## Limited Use

The use of information received from Chrome APIs adheres to the Chrome Web
Store User Data Policy, including the Limited Use requirements.

## Contact

Questions and support requests can be submitted at:

https://github.com/FranciscoMoretti/osbe/issues
