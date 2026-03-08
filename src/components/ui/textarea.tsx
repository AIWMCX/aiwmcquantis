import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-[var(--q-radius-md)] border border-[var(--q-border-default)] bg-[var(--q-bg-input)] px-3 py-2 text-[15px] text-[var(--q-text-primary)]",
          "ring-offset-background",
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
Textarea.displayName = "Textarea"

export { Textarea }
