# @osbe/ui

Shared OSBE theme and shadcn/ui source components.

Extensions import components directly from package exports, for example:

```tsx
import { Button } from "@osbe/ui/components/button"
```

Shared primitives are owned here. Extension-specific composition stays inside the extension. Add or update shadcn components by running the shadcn CLI from an extension directory; the monorepo aliases route UI source into this package.
