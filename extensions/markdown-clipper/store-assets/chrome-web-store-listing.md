# Chrome Web Store Listing

## Summary From Package

One-click Markdown clipper. Save pages and selections as clean Markdown with images, frontmatter, preview, copy, and download.

## Description

One-click Markdown web clipper for saving pages and selections as clean, portable Markdown.

OSBE Markdown Clipper helps you capture useful web content for AI agents, LLM workflows, documentation, notes, research, and personal knowledge bases. Open the popup on any normal web page, review the generated Markdown, then copy it or download it.

## Why OSBE Markdown Clipper?

Whether you are saving API docs, collecting research, turning reference pages into context for an AI agent, or building a Markdown knowledge base, OSBE Markdown Clipper gives you a focused workflow without extra send-to-service features.

## Clipping And Conversion

- Clip the current page into Markdown.
- Clip selected content from the context menu.
- Preserve common page structure including headings, paragraphs, links, lists, tables, blockquotes, code blocks, and images.
- Use the current tab title as the document title.
- Add optional frontmatter with title, source URL, and clipping timestamp.
- Keep image links in Markdown or download page images alongside the Markdown file.

## Preview, Copy, And Download

- Review generated Markdown directly in the popup.
- Toggle between Markdown source and rich text preview.
- See the Markdown character count before copying or downloading.
- Copy Markdown to the clipboard.
- Download a `.md` file when images are off.
- Download a `.zip` containing Markdown and local image assets when images are on.

## Appearance

- Light and dark popup modes.
- Compact browser-extension UI built for quick clipping from the current tab.

## Privacy

OSBE Markdown Clipper runs only when you invoke it from the popup or context menu. It uses current-tab access to read the page or selection, convert it to Markdown, and copy or download the result. It does not declare broad host permissions.

## Store Metadata

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
Convert the current webpage or selected content into Markdown and let the user preview, copy, or download the result.
```

### Permission Justifications

#### activeTab

```text
Temporarily accesses the current tab only after the user clicks the extension or selects an extension context menu action, so the page can be converted to Markdown.
```

#### contextMenus

```text
Adds right-click actions so users can clip selected webpage content as Markdown.
```

#### downloads

```text
Saves user-requested Markdown files or ZIP files containing Markdown and local image assets.
```

#### offscreen

```text
Creates Blob URLs for Markdown and ZIP downloads because Manifest V3 service workers cannot create DOM Blob object URLs.
```

#### scripting

```text
Runs the Markdown clipping script only after the user invokes the extension on the current tab.
```

#### storage

```text
Stores the user's Images and Template clipping preferences so popup and context menu actions use the same options.
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
Website content
```

### Distribution

Visibility:

```text
Public
```

Pricing:

```text
Free
```
