import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--q-radius-md)] text-sm font-medium ring-offset-background transition-all duration-[var(--q-duration-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--q-accent-primary)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--q-accent-primary)] text-white font-semibold hover:brightness-110 hover:-translate-y-px active:translate-y-0 active:brightness-95",
        secondary:
          "bg-transparent border border-[var(--q-border-strong)] text-[var(--q-text-primary)] hover:bg-[var(--q-bg-elevated)]",
        ghost:
          "text-[var(--q-accent-primary)] hover:bg-[var(--q-accent-glow)] active:scale-[0.98]",
        danger:
          "bg-[var(--q-status-red-bg)] border border-[var(--q-status-red-border)] text-[var(--q-status-red)] hover:bg-[var(--q-status-red)]/10",
        destructive:
          "bg-[var(--q-status-red)] text-white hover:bg-[var(--q-status-red)]/90",
        outline:
          "border border-[var(--q-border-default)] bg-[var(--q-bg-surface)] hover:bg-[var(--q-bg-elevated)] hover:text-[var(--q-text-primary)]",
        link: "text-[var(--q-accent-primary)] underline-offset-4 hover:underline",
        ai: "q-btn-ai text-white font-semibold",
      },
      size: {
        default: "h-12 px-6 text-sm",
        sm: "h-9 rounded-[var(--q-radius-sm)] px-4 text-xs",
        lg: "h-[52px] rounded-[var(--q-radius-md)] px-8 text-base",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  isLoading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isLoading = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="animate-spin" />
            <span className="opacity-0">{children}</span>
          </>
        ) : (
          children
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
