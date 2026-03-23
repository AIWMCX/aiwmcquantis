import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-[var(--q-radius-sm)] px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground border",
        success:
          "bg-[var(--q-status-green-bg)] text-[var(--q-status-green)] border border-[var(--q-status-green-border)]",
        warning:
          "bg-[var(--q-status-yellow-bg)] text-[var(--q-status-yellow)] border border-[var(--q-status-yellow-border)]",
        danger:
          "bg-[var(--q-status-red-bg)] text-[var(--q-status-red)] border border-[var(--q-status-red-border)]",
        neutral:
          "bg-[var(--q-bg-elevated)] text-[var(--q-text-secondary)] border border-[var(--q-border-subtle)]",
        plus:
          "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
