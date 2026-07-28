import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "../lib/utils"

const brandVariants = cva("flex min-w-0 items-center gap-3", {
  variants: {
    appearance: {
      default: "text-foreground",
      inherit: "text-inherit",
      inverse: "text-primary-foreground"
    }
  },
  defaultVariants: {
    appearance: "default"
  }
})

const iconVariants = cva(
  "flex shrink-0 items-center justify-center overflow-hidden rounded-md border",
  {
    variants: {
      appearance: {
        default: "border-border bg-card",
        inherit: "border-transparent bg-transparent",
        inverse: "border-primary-foreground/15 bg-primary-foreground/10"
      },
      size: {
        sm: "size-9",
        md: "size-10"
      }
    },
    defaultVariants: {
      appearance: "default",
      size: "md"
    }
  }
)

type ExtensionBrandProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof brandVariants> &
  VariantProps<typeof iconVariants> & {
    description?: React.ReactNode
    iconSrc: string
    name: React.ReactNode
  }

export function ExtensionBrand({
  appearance,
  className,
  description,
  iconSrc,
  name,
  size,
  ...props
}: ExtensionBrandProps) {
  return (
    <div className={cn(brandVariants({ appearance }), className)} {...props}>
      <div className={iconVariants({ appearance, size })}>
        <img
          alt=""
          aria-hidden="true"
          className="size-full object-cover"
          src={iconSrc}
        />
      </div>
      <div className="min-w-0">
        <div className="truncate text-base font-bold leading-5">{name}</div>
        {description ? (
          <div
            className={cn(
              "truncate text-xs font-medium leading-4",
              appearance === "inverse"
                ? "text-primary-foreground/70"
                : appearance === "inherit"
                  ? "text-inherit opacity-70"
                  : "text-muted-foreground"
            )}>
            {description}
          </div>
        ) : null}
      </div>
    </div>
  )
}
