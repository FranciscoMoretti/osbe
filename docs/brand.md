# OSBE Brand System

OSBE stands for Open Source Browser Extensions: small browser tools with public source, clear permissions, and behaviour people can reason about.

The brand should feel like an open workshop. Precise, useful, and visibly constructed. Never like security theatre.

## Brand idea

### Primary line

> Small tools. Open source. No mystery.

This is the public-facing OSBE promise. It is specific enough to be memorable and broad enough to hold the full extension catalogue.

### Supporting line

> Focused browser extensions with public source, plain-language permissions, and no hidden business model.

### Developer line

> Fork one. Build your own.

### Closing line

> The code is the product.

## Positioning

OSBE is an open-source collection of focused browser extensions for people who want useful tools without opaque permissions or unnecessary product machinery.

OSBE does not claim that open source makes software automatically safe. It makes the product inspectable:

- the code is public;
- permissions have plain-language justifications;
- runtime behaviour is documented;
- product data stays local unless explicitly stated otherwise;
- builds and release inputs can be reproduced;
- every extension is small enough to understand.

## Brand pillars

### Inspectable

Source, permissions, data use, and runtime triggers are part of the product experience—not legal text hidden after installation.

### Focused

One extension, one clear job. New features should deepen that job rather than turn an extension into a platform.

### User-controlled

Prefer explicit user action. When an extension must run automatically, name the exact navigation or site boundary.

### Forkable

OSBE is a useful catalogue and a collection of working starting points. The foundation should make it easier to study, adapt, and ship an extension.

## Voice

OSBE sounds calm, direct, technically literate, and slightly editorial.

Use:

- “Runs when you click it.”
- “Stores presets in `chrome.storage.local`.”
- “Requests access only to `youtube.com`.”
- “Read the source or build it yourself.”
- “Every permission is explained.”

Avoid:

- “Military-grade security”
- “Completely safe”
- “Privacy guaranteed”
- “The ultimate extension platform”
- “Revolutionary”
- fear-heavy claims about other extensions
- vague verbs such as “optimise”, “streamline”, or “supercharge”

Write in short, active sentences. Prefer a concrete mechanism over a trust adjective.

## Message hierarchy

1. The extension does one useful job.
2. The source is public.
3. Permissions and runtime behaviour are explicit.
4. Data handling is local-first and documented.
5. People can install, inspect, build, or fork it.

Every product page should answer:

- What does it do?
- When does it run?
- What can it access?
- What does it store?
- Does anything leave the browser?
- Where is the source?
- How can I build it?

## Visual idea

The visual system is an open-source field manual:

- true paper white;
- deep navy ink;
- expressive condensed display type;
- readable humanist body type;
- small monospace technical annotations;
- thin rules and source-line gutters;
- asymmetrical editorial grids;
- real manifests, permissions, and product screenshots as visual content.

The system should feel engineered but not cold. Product colour provides the energy.

Avoid:

- cyber-security clichés;
- shields, padlocks, and hacker terminals;
- purple SaaS gradients;
- neon glows and floating orbs;
- bento-card repetition;
- decorative dashboards or fake metrics;
- excessive pills and badges;
- stock imagery.

## Colour

### Core

| Role         | Value     | Use                                          |
| ------------ | --------- | -------------------------------------------- |
| Ink          | `#0b1528` | Text, rules, primary actions, dark bands     |
| Paper        | `#ffffff` | Website and documentation background         |
| Muted ink    | `#5f6877` | Supporting copy and metadata                 |
| Soft rule    | `#dce1e7` | Table structure and quiet separators         |
| Glass        | `#e0f2fe` | Master OSBE mark and neutral brand surfaces  |
| Glass border | `#bfdbfe` | Master mark edge                             |
| Signal coral | `#ff4d3d` | OSBE node and high-attention product meaning |

### Product recognition colours

| Product                | Colour                        | Recognition job          |
| ---------------------- | ----------------------------- | ------------------------ |
| Markdown Clipper       | Cobalt `#0d5bff`              | Capture text / Markdown  |
| Site Blocker           | Coral `#ff4d3d`               | Stop / block             |
| Full Page Capture      | Amber `#e88c00`               | Capture / output         |
| Window Resizer         | Violet `#7138cf`              | Dimensions / layout      |
| YouTube Shorts Remover | Ink `#111827` + red `#ff2f24` | YouTube-specific removal |

Product colour is not decoration. It exists to create instant toolbar recognition and a stable wayfinding cue across the website, store, and extension UI.

Semantic success, warning, and error colours remain separate from product identity.

## Typography

Website:

- Display: Barlow Condensed, weights 500–700
- Body: IBM Plex Sans, weights 400–600
- Technical annotations: IBM Plex Mono, weights 400–500

Extension UI may use platform fonts for performance and native density, but headings should remain strong, labels should remain plain, and technical values should use a deliberate monospace stack.

Rules:

- large display copy is short and uppercase;
- body copy uses sentence case;
- monospace is for facts, commands, paths, and metadata—not whole paragraphs;
- buttons use specific actions such as “Add to Chrome”, “Inspect the source”, and “Copy command”;
- avoid tiny uppercase labels unless they describe real structure.

## Master mark

The OSBE master mark is a pale glass tile with a thick open ink ring and one coral node.

The ring represents a public shared core. The node represents one focused tool joining it.

Canonical sources:

- `docs/assets/osbe-icon-source.svg`
- `docs/assets/osbe-logo-official.png`

Do not use a shield, lock, puzzle piece, or angle brackets as the master symbol.

## Extension icon system

Extension icons are a family, not clones.

Shared DNA:

- `1:1` square;
- the same rounded tile geometry;
- transparent outer corners;
- restrained lower-rim material cue;
- one oversized white functional symbol;
- strong contrast at `16px`;
- no text, shadows, or tiny browser chrome.

Differentiation:

- each product owns one dominant colour;
- each product owns one primary silhouette;
- no two adjacent toolbar icons should depend on the same outer frame;
- colour and silhouette must both work before detail is visible.

Product symbols:

- Markdown Clipper: Markdown `M` plus down arrow.
- Site Blocker: block sign only.
- Full Page Capture: down arrow plus two opposing capture corners.
- Window Resizer: opposing diagonal arrows.
- YouTube Shorts Remover: red short-video/play surface crossed by one white removal stroke.

The pale master OSBE tile remains neutral. Product icons use saturated colour because toolbar recognition takes priority over literal material consistency.

Canonical source and generation:

```text
extensions/<slug>/assets/icon-source.svg
pnpm extension artwork <slug>
```

The source SVG must generate both runtime and `128px` store icons through the repository artwork pipeline. Never maintain hand-edited PNG variants.

Before approval, inspect every icon at:

- `512px` for geometry;
- `128px` for store presentation;
- `32px` for extension menus;
- `16px` against a dark toolbar.

## Website system

The website is a catalogue and a trust document, not a generic marketing funnel.

Page rhythm:

1. Promise: “Small tools. Open source. No mystery.”
2. Product signal: differentiated icons and a permission ledger.
3. Catalogue: five tools and five clear jobs.
4. Trust contract: source, permissions, data, and runtime.
5. Developer invitation: fork one and build your own.

Use open grids, rules, bands, and ledgers. Avoid wrapping every idea in a card.

All product facts should come from `extension.config.json` or another canonical repository source. Marketing copy must never contradict the manifest.

## Extension UI

Extension interfaces should feel like focused instruments:

- one obvious primary action;
- plain white or paper surfaces;
- deep ink controls;
- product colour for selection, focus, and wayfinding;
- simple borders over heavy shadows;
- small trust metadata where it helps;
- no decorative glass, glow, or repeated cards in compact popups.

Product colour must not replace semantic states. Destructive, warning, and success actions keep their normal meaning.

## Asset checklist

Before a brand change ships:

- toolbar icons remain distinct at `16px`;
- SVG source and generated PNGs match;
- Chrome Web Store icons are regenerated;
- the website builds and passes responsive QA;
- README images render on GitHub;
- product names and permission facts match extension metadata;
- light and dark surrounding surfaces preserve contrast;
- focus states remain visible;
- animation respects `prefers-reduced-motion`.

## Product quality bar

Every OSBE extension should ship with:

- public source;
- explicit permissions and host permissions;
- plain-language privacy documentation;
- a reproducible local build;
- no remote code;
- a focused scope;
- tests at the product’s behavioural boundary;
- a canonical icon source;
- a store dossier and release workflow;
- a README that explains popup, background, content-script, options, result-page, and offscreen surfaces where applicable.
