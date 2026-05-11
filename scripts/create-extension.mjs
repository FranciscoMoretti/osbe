#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, "..")

const slug = process.argv[2]
const displayName = process.argv.slice(3).join(" ")

if (!slug || !displayName) {
  console.error('Usage: pnpm new:extension <kebab-name> "OSBE Display Name"')
  process.exit(1)
}

if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  console.error(
    "Extension name must be kebab case, for example: markdown-clipper"
  )
  process.exit(1)
}

const extensionRoot = path.join(repoRoot, "extensions", slug)

const files = new Map([
  [
    "package.json",
    JSON.stringify(
      {
        name: `@osbe/${slug}`,
        displayName,
        version: "0.0.1",
        description: `${displayName} browser extension.`,
        author: "Fran",
        scripts: {
          dev: "plasmo dev",
          build: "plasmo build",
          package: "plasmo package"
        },
        dependencies: {
          "@radix-ui/react-slot": "^1.2.3",
          "class-variance-authority": "^0.7.1",
          clsx: "^2.1.1",
          "lucide-react": "^0.468.0",
          plasmo: "0.90.5",
          react: "18.2.0",
          "react-dom": "18.2.0",
          "tailwind-merge": "^2.6.0",
          tailwindcss: "3.4.1"
        },
        devDependencies: {
          "@ianvs/prettier-plugin-sort-imports": "4.1.1",
          "@types/chrome": "0.0.258",
          "@types/node": "20.11.5",
          "@types/react": "18.2.48",
          "@types/react-dom": "18.2.18",
          postcss: "8.4.33",
          prettier: "3.2.4",
          typescript: "5.3.3"
        },
        manifest: {
          permissions: ["activeTab"]
        }
      },
      null,
      2
    ) + "\n"
  ],
  [
    "tsconfig.json",
    JSON.stringify(
      {
        extends: "plasmo/templates/tsconfig.base",
        exclude: ["node_modules"],
        include: [".plasmo/index.d.ts", "./**/*.ts", "./**/*.tsx"],
        compilerOptions: {
          paths: {
            "~*": ["./src/*"]
          },
          baseUrl: "."
        }
      },
      null,
      2
    ) + "\n"
  ],
  [
    "components.json",
    JSON.stringify(
      {
        $schema: "https://ui.shadcn.com/schema.json",
        style: "new-york",
        rsc: false,
        tsx: true,
        tailwind: {
          config: "tailwind.config.js",
          css: "src/style.css",
          baseColor: "zinc",
          cssVariables: true
        },
        aliases: {
          components: "~components",
          utils: "~lib/utils",
          ui: "~components/ui",
          lib: "~lib",
          hooks: "~hooks"
        }
      },
      null,
      2
    ) + "\n"
  ],
  [
    "postcss.config.js",
    `/**
 * @type {import('postcss').ProcessOptions}
 */
module.exports = {
  plugins: {
    tailwindcss: {}
  }
}
`
  ],
  [
    "tailwind.config.js",
    `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{tsx,html}"],
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)"
      }
    }
  },
  plugins: []
}
`
  ],
  [
    "src/style.css",
    `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
}
`
  ],
  [
    "src/lib/utils.ts",
    `import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
`
  ],
  [
    "src/components/ui/button.tsx",
    `import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "~lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
`
  ],
  [
    "src/popup.tsx",
    `import { FileText } from "lucide-react"

import "~style.css"

import { Button } from "~components/ui/button"

function IndexPopup() {
  return (
    <div className="w-[360px] bg-background p-4 text-foreground">
      <header className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-base font-semibold leading-5">${displayName}</h1>
          <p className="text-xs text-muted-foreground">
            New OSBE extension scaffold.
          </p>
        </div>
      </header>

      <Button className="w-full">Ready</Button>
    </div>
  )
}

export default IndexPopup
`
  ],
  [
    "README.md",
    `# ${displayName}

An OSBE browser extension built with Plasmo, Tailwind CSS, and shadcn/ui conventions.

## Development

\`\`\`bash
pnpm --filter @osbe/${slug} dev
\`\`\`

Load the generated development extension from:

\`\`\`text
extensions/${slug}/build/chrome-mv3-dev
\`\`\`

## Production Build

\`\`\`bash
pnpm --filter @osbe/${slug} build
\`\`\`
`
  ]
])

try {
  await mkdir(extensionRoot, { recursive: false })
} catch (error) {
  if (error?.code === "EEXIST") {
    console.error(`Extension already exists: extensions/${slug}`)
    process.exit(1)
  }

  throw error
}

for (const file of files.keys()) {
  await mkdir(path.dirname(path.join(extensionRoot, file)), { recursive: true })
}

for (const [file, content] of files) {
  await writeFile(path.join(extensionRoot, file), content, { flag: "wx" })
}

const rootPackageJsonPath = path.join(repoRoot, "package.json")
const rootPackageJson = JSON.parse(await readFile(rootPackageJsonPath, "utf8"))
rootPackageJson.scripts[`dev:${slug}`] = `pnpm --filter @osbe/${slug} dev`
rootPackageJson.scripts[`build:${slug}`] = `pnpm --filter @osbe/${slug} build`
rootPackageJson.scripts[`package:${slug}`] =
  `pnpm --filter @osbe/${slug} package`

await writeFile(
  rootPackageJsonPath,
  `${JSON.stringify(rootPackageJson, null, 2)}\n`
)

console.log(`Created extensions/${slug}`)
console.log(`Run: pnpm install`)
console.log(`Then: pnpm --filter @osbe/${slug} dev`)
