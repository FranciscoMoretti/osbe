# Chrome Web Store Submission

This document contains final copy for every Chrome Web Store field. Copy only
the text inside each fenced block.

## Store Listing

### Title From Package

```text
OSBE Full Page Capture
```

### Summary From Package

This value comes from `package.json` and cannot be edited in the dashboard.

```text
Capture complete web pages as full-height PNG images or paginated PDF files.
```

### Description

```text
Capture an entire webpage in one click—not only the part visible on screen.

OSBE Full Page Capture scrolls through the current page, creates one continuous preview, and lets you download the result as a lossless PNG or paginated PDF.

HOW IT WORKS

1. Open the page you want to capture.
2. Click the extension icon.
3. Keep that tab active while the extension scrolls through the page.
4. Download the completed capture as PNG or PDF.

BUILT FOR COMPLETE PAGES

- Captures the full vertical page at the current viewport width.
- Avoids repeating fixed and sticky page elements where possible.
- Restores your original scroll position after capture.
- Handles very tall pages by safely splitting PNG output into numbered parts.
- Creates one paginated PDF even when PNG output must be split.
- Also supports an Alt+Shift+P keyboard shortcut (Control+Shift+P on macOS).

PRIVATE BY DESIGN

Capture starts only when you invoke it. Page pixels, title, URL, and dimensions are processed locally in memory. There is no account, analytics, advertising, remote service, or capture history, and nothing is sent to OSBE.

OSBE Full Page Capture is open source.
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
extensions/full-page-capture/store-assets/store-icon-128.png
```

### Screenshot

Upload:

```text
extensions/full-page-capture/store-assets/screenshots/capture-preview-1280x800.png
```

### Official URL

Leave this as `None`.

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
Capture the full height of the current webpage and let the user download the result as PNG or PDF.
```

### Permission Justifications

#### activeTab

```text
Grants temporary access to the current page only after the user clicks the extension icon or invokes its shortcut. This access is required to capture visible tab images while scrolling, without requesting persistent access to all websites. The captured pixels and page URL are processed locally and are not transmitted.
```

#### scripting

```text
Runs temporary helpers in the user-invoked page to measure its full height, scroll between viewports, avoid repeating fixed or sticky elements, and restore the original scroll position. The extension does not install a persistent content script and does not run until the user invokes a capture.
```

### Remote Code

Select `No` and use:

```text
The extension does not use remote code. All executable JavaScript and CSS, including image stitching, ZIP creation, and PDF generation, is included in the submitted package.
```

### Data Types

Select:

```text
Website content
Web history
```

Use this explanation if the dashboard provides a text field:

```text
During a user-invoked capture, the extension temporarily handles visible page pixels, the current page title and URL, and page dimensions. This information is used only to assemble the full-page image, label the local preview, and name the requested download. It is held in memory, is not added to a capture history, and is not transmitted to OSBE or third parties.
```

### Data Usage Certifications

Confirm all of the following:

- Data is not sold to third parties.
- Data is not used or transferred for purposes unrelated to the extension's
  single purpose.
- Data is not used or transferred to determine creditworthiness or for lending.

### Privacy Policy URL

```text
https://github.com/FranciscoMoretti/osbe/blob/main/extensions/full-page-capture/PRIVACY.md
```

The repository changes must be pushed before saving this URL in the dashboard.

## Test Instructions

### Login Or Credentials

```text
No account, login, or credentials are required.
```

### Instructions

```text
1. Open a normal webpage that is taller than the browser viewport.
2. Click the OSBE Full Page Capture toolbar icon.
3. Keep the source tab active while the page scrolls automatically.
4. Confirm the result tab opens after capture and shows one continuous full-height preview.
5. Select “Download PNG” and confirm Chrome downloads a PNG image.
6. Select “Download PDF” and confirm Chrome downloads a paginated PDF.
7. Return to the source tab and confirm its original scroll position was restored.

Chrome does not allow extensions to capture chrome:// pages, the Chrome Web Store, or other protected browser surfaces.
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
extensions/full-page-capture/build/chrome-mv3-prod.zip
```
