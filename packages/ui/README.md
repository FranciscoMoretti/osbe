# @osbe/ui

Shared OSBE theme and shadcn/ui source components.

Extensions import components directly from package exports, for example:

```tsx
import { Button } from "@osbe/ui/components/button"
```

Shared primitives are owned here. Extension-specific composition stays inside
the extension. Add or update a shadcn component from the repository root:

```bash
pnpm dlx shadcn@2.3.0 add dialog --cwd packages/ui
```

The package's TypeScript aliases resolve CLI output into `src/components` and
`src/lib`; extension aliases resolve imports back to the same shared source.

Use the branded compositions for consistent extension chrome:

```tsx
import { ExtensionBrand } from "@osbe/ui/components/extension-brand"
import {
  ExtensionPageHeader,
  PopupShell,
  StatusPanel
} from "@osbe/ui/components/extension-shell"
```

`PopupShell` owns popup framing and spacing. `ExtensionPageHeader` owns the
full-page product header. `StatusPanel` provides consistent success, warning,
error, and neutral feedback. Add cross-product compositions here only after at
least two extensions need the same semantics.
