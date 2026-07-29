# Chrome Web Store Submission

## Store Listing

### Summary From Package

```text
Resize the current Chrome window or page viewport from built-in presets or your own saved sizes.
```

### Description

OSBE Window Resizer gives you repeatable browser and viewport sizes without opening
developer tools or typing dimensions every time.

Choose a built-in mobile, tablet, laptop, or desktop preset and the current
Chrome window resizes immediately. Each preset can target the complete window
or the active page viewport. Add named custom presets using the current target
dimensions as a starting point, then edit, reorder, or delete them from the same
compact popup.

What it includes:

- Six built-in device window sizes
- Window or viewport target per preset
- One-click resizing from the toolbar
- Custom presets prefilled from the selected target
- Simple edit, delete, reorder, and reset controls
- Local-only storage
- No account, analytics, ads, tracking, or remote code

Window dimensions include the complete Chrome frame. Viewport dimensions apply
to the page area and automatically compensate for browser chrome.

OSBE extensions are open source and built to stay small, understandable, and
focused on one job.

### Category

```text
Productivity
```

### Language

```text
English
```

## Privacy Practices

### Single Purpose

```text
Resize the current Chrome browser window or active page viewport to a user-selected saved width and height.
```

### Permission Justifications

`storage`

```text
Stores the user's custom window-size presets and preferred preset order locally on their device.
```

`activeTab`

```text
Temporarily accesses the current tab after the user opens the extension so viewport-targeted presets can measure the page area.
```

`scripting`

```text
Runs a small local measurement function in the active tab to read its viewport width and height; it does not read or modify page content.
```

Chrome's `windows` API reads and updates the current browser window bounds.
For viewport targets, `activeTab` and `scripting` run a small local function that
reads only `window.innerWidth` and `window.innerHeight`. The extension does not
read page content, browsing history, or tab URLs.

### Remote Code

Select `No` and use:

```text
The extension does not use remote code. All executable JavaScript and CSS is included in the submitted package.
```

### Data Types

Select no Chrome Web Store user-data categories. Preset names, dimensions,
targets, and ordering are local extension settings and are not transmitted.

## Distribution

Visibility:

```text
Public
```

Pricing:

```text
Free
```
