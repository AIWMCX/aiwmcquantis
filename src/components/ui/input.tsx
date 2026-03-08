import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-[var(--q-radius-md)] border border-[var(--q-border-default)] bg-[var(--q-bg-input)] px-3 py-2 text-[15px] text-[var(--q-text-primary)] ring-offset-background",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-[var(--q-text-tertiary)]",
          "focus-visible:outline-none focus-visible:border-[var(--q-accent-primary)] focus-visible:shadow-[0_0_0_3px_var(--q-accent-glow)] focus-visible:ring-0",
          "transition-all duration-[150ms] ease-out",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
