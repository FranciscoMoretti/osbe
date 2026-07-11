# Chrome Web Store Submission

This document contains final copy for every Chrome Web Store field. Copy only
the text inside each fenced block.

## Store Listing

### Title From Package

```text
OSBE Site Blocker
```

### Summary From Package

This value comes from `package.json` and cannot be edited in the dashboard.

```text
Block distracting websites with local rules, temporary access, and a private dashboard.
```

### Description

```text
Block distracting websites with simple rules that stay in your browser.

Add a website once and OSBE Site Blocker blocks every page on that domain and its subdomains. Manage your list from a clear dashboard without creating an account.

WHAT YOU CAN DO

- Add, edit, disable, or remove blocked websites.
- Pause all blocking without losing your list.
- Allow access to one website for 5, 10, 15, or 30 minutes. Blocking resumes automatically when the timer ends.
- Create more-specific exceptions. For example, block google.com while allowing mail.google.com.
- Import and export your block list as a JSON file.
- Check whether the current tab is blocked from the toolbar popup.
- See which rule caused a page to be blocked.

PRIVATE BY DESIGN

Your block list and settings are stored locally in Chrome. OSBE Site Blocker has no account, analytics, advertising, or remote sync.

The optional “Verify official build” action contacts osbe.dev only after you click it. It sends the extension name, version, runtime ID, and a short-lived verification challenge. It does not send your block list, settings, or browsing activity.

OSBE Site Blocker is open source.
```

### Category

```text
Productivity
```

### Language

```text
English
```

### Store Icon

Upload:

```text
extensions/site-blocker/store-assets/store-icon-128.png
```

### Screenshot

Upload:

```text
extensions/site-blocker/store-assets/screenshots/dashboard-1280x800.png
```

### Official URL

Leave this as `None` unless `osbe.dev` has been verified in Google Search
Console and appears in the selector.

### Homepage URL

```text
https://github.com/FranciscoMoretti/osbe
```

### Support URL

```text
https://github.com/FranciscoMoretti/osbe/issues
```

### Mature Content

```text
No
```

Small and marquee promotional tiles are optional for the first release.

## Privacy Practices

### Single Purpose

```text
Block websites chosen by the user and manage temporary access to those websites from a local dashboard.
```

### Permission Justifications

#### activeTab

```text
Reads the current tab URL only when the user opens the extension popup. This lets the popup show whether the current website matches an active local block rule. The URL is not stored or transmitted.
```

#### alarms

```text
Checks once per minute for expired temporary-access timers so blocking can resume automatically when the selected duration ends.
```

#### declarativeNetRequest

```text
Creates local dynamic rules that redirect top-level navigation for user-selected websites to the extension's local blocked page. Rules are created only from websites in the user's block list.
```

#### favicon

```text
Displays Chrome's locally cached favicon beside each website in the dashboard so rules are easier to identify. The extension does not request favicons from an OSBE server.
```

#### storage

```text
Stores the user's block list, enabled states, temporary-access timers, global pause setting, and short-lived verification challenge in chrome.storage.local. This information stays in the user's Chrome profile.
```

#### Host Permission

```text
The user can add any website to the block list. Access to all URLs is required so Chrome's declarativeNetRequest engine can redirect navigation for the exact domains and subdomains chosen by the user. The extension does not read page content or run content scripts on websites.
```

### Remote Code

Select `No` and use:

```text
The extension does not use remote code. All executable JavaScript and CSS is included in the submitted package.
```

### Data Types

Select:

```text
Web history
```

Do not select `Website content`: the extension does not read page content.

Use this explanation if the dashboard provides a text field:

```text
The extension handles user-entered website hostnames and briefly reads the active tab URL when the user opens the popup. This information is used only to apply local blocking rules and show current-site status. The active tab URL is not stored. Block rules and settings are stored only in chrome.storage.local and are not transmitted to OSBE or third parties.
```

### Data Usage Certifications

Confirm all of the following:

- Data is not sold to third parties.
- Data is not used or transferred for purposes unrelated to the extension's
  single purpose.
- Data is not used or transferred to determine creditworthiness or for lending.

### Privacy Policy URL

```text
https://github.com/FranciscoMoretti/osbe/blob/main/extensions/site-blocker/PRIVACY.md
```

The repository changes must be pushed before saving this URL in the dashboard.

## Test Instructions

### Login Or Credentials

```text
No account, login, or credentials are required.
```

### Instructions

```text
1. Open the extension dashboard from the toolbar popup.
2. Select “Add to Block List”, enter reddit.com, and select “Add site”.
3. Open https://reddit.com in a new tab. Chrome should redirect to the extension's local blocked page.
4. Return to the dashboard, open the actions menu for reddit.com, and select “Temporary access”.
5. Choose 5 minutes and select “Allow access”. reddit.com should be accessible until the timer ends.
6. Turn off “Global blocking”. All rules should remain listed but navigation should no longer be blocked.
7. Turn global blocking back on. Active rules should begin blocking again.

Optional specificity test:
Add google.com and mail.google.com, then disable mail.google.com. google.com and its other subdomains should remain blocked while mail.google.com is allowed because the more-specific rule takes priority.
```

## Distribution

### Visibility

```text
Public
```

### Pricing

```text
Free
```

Select all regions where the extension should be available. Complete the
publisher's Trader or Non-Trader declaration separately based on the
publisher's legal status.

## Package

Upload:

```text
extensions/site-blocker/build/chrome-mv3-prod.zip
```
