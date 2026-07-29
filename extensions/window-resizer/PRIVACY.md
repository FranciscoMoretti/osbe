# OSBE Window Resizer Privacy Policy

OSBE Window Resizer resizes the current Chrome browser window or active page
viewport to a user-selected width and height. It runs entirely on the user's
device.

## Data handled

The extension reads the current browser window and active page viewport
dimensions so it can prefill a new custom preset, display the current sizes,
and compensate for browser chrome when a viewport target is selected. It stores
custom preset names, dimensions, targets, and ordering locally through Chrome's
extension storage.

For viewport-targeted presets, the extension runs a small local measurement
function in the active tab that reads only `window.innerWidth` and
`window.innerHeight`. It does not read page content, browsing history, tab URLs,
personal information, authentication information, or communications.

## Local storage

Preset data, including each preset's window or viewport target, is stored only
in `chrome.storage.local` on the user's device. It is not synced by OSBE. Users
can edit or delete individual presets, restore the built-in defaults, or remove
all extension data by uninstalling the extension.

## Transmission and sharing

OSBE Window Resizer does not transmit, sell, transfer, or share user data. It
does not use analytics, advertising, tracking, or external services.

## Remote code

The extension does not execute remote code. All executable JavaScript and CSS
is included in the submitted package.

## Limited Use

The use of information received from Chrome APIs adheres to the Chrome Web
Store User Data Policy, including the Limited Use requirements.

## Contact

Questions and support requests can be submitted at:

https://github.com/FranciscoMoretti/osbe/issues
