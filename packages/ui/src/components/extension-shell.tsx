import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "../lib/utils"
import { ExtensionBrand } from "./extension-brand"

const popupShellVariants = cva("bg-background p-4 text-foreground", {
  variants: {
    width: {
      sm: "w-[360px]",
      md: "w-[420px]"
    }
  },
  defaultVariants: {
    width: "sm"
  }
})

type PopupShellProps = React.HTMLAttributes<HTMLElement> &
  VariantProps<typeof popupShellVariants>

export function PopupShell({ className, width, ...props }: PopupShellProps) {
  return (
    <main className={cn(popupShellVariants({ width }), className)} {...props} />
  )
}

type ExtensionPageHeaderProps = {
  actions?: React.ReactNode
  className?: string
  description?: React.ReactNode
  iconSrc: string
  name: React.ReactNode
}

export function ExtensionPageHeader({
  actions,
  className,
  description,
  iconSrc,
  name
}: ExtensionPageHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-primary-foreground/15 bg-primary text-primary-foreground shadow-sm">
      <div
        className={cn(
          "mx-auto flex min-h-16 max-w-[1600px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6",
          className
        )}>
        <ExtensionBrand
          appearance="inverse"
          className="flex-1"
          description={description}
          iconSrc={iconSrc}
          name={name}
        />
        {actions ? (
          <div className="flex items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  )
}

type StatusPanelProps = React.HTMLAttributes<HTMLElement> & {
  description: React.ReactNode
  icon?: React.ReactNode
  title: React.ReactNode
  tone?: "error" | "neutral" | "success" | "warning"
}

export function StatusPanel({
  className,
  description,
  icon,
  title,
  tone = "neutral",
  ...props
}: StatusPanelProps) {
  const toneClasses = {
    error: {
      icon: "bg-destructive/10 text-destructive",
      panel: "border-destructive/30 bg-destructive/5"
    },
    neutral: {
      icon: "bg-secondary text-secondary-foreground",
      panel: "bg-card"
    },
    success: {
      icon: "bg-brand-green/10 text-brand-green",
      panel: "border-brand-green/30 bg-brand-green/5"
    },
    warning: {
      icon: "bg-brand-amber/10 text-brand-amber",
      panel: "border-brand-amber/30 bg-brand-amber/5"
    }
  }[tone]

  return (
    <section
      className={cn("rounded-lg border p-4", toneClasses.panel, className)}
      {...props}>
      <div className="flex items-start gap-3">
        {icon ? (
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-md [&_svg]:size-5",
              toneClasses.icon
            )}>
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-sm font-bold leading-5">{title}</h2>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </section>
  )
}
