# Browser Extension Description Rules

Use this checklist when writing Chrome Web Store summaries and descriptions for OSBE extensions.

## Principles

- Use `package.json` `description` only for the short "Summary from package"; keep it under Chrome's 132-character manifest limit.
- Keep the long dashboard `Description` in `store-assets/chrome-web-store-listing.md`; Chrome allows up to 16,000 characters there.
- Lead both fields with what the extension does in concrete language.
- Keep listing copy feature-led: users should understand the useful actions they get immediately.
- Name the core workflow before secondary details.
- Mention privacy or permissions only when it answers an obvious user concern.
- Prefer plain verbs: clip, copy, preview, download, block, save, export, sync.
- Avoid vague claims like powerful, seamless, next-generation, or productivity booster.
- Avoid competitor comparisons unless the extension intentionally replaces a specific workflow.
- Make every word in the short package summary describe a capability.

## Useful Structure

1. Package summary: one short sentence for `package.json` `description`.
2. Store description opener: one sentence that repeats the core purpose in human listing copy.
3. Feature sections or bullets.
4. Optional workflow note for how the feature behaves.
5. Optional privacy or permission note.

## Feature Bullet Style

- Start each bullet with the feature, not a marketing adjective.
- Use present tense.
- Keep bullets scannable and parallel.
- Include formats, outputs, and controls when they matter.

## Markdown Clipper Feature Notes

- Clips full pages or selected content into Markdown.
- Uses the current tab title as the document title.
- Copies Markdown to the clipboard.
- Downloads Markdown, or a ZIP when images are included.
- Includes an Images toggle for capturing page images.
- Includes a Template toggle for frontmatter metadata.
- Shows Markdown character count.
- Provides rich text preview for headings and common Markdown blocks.
- Supports light and dark popup modes.
