import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      toastOptions={{
        style: { maxWidth: '380px' },
        duration: 5000,
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-[var(--q-radius-md)]",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success:
            "group-[.toaster]:border-l-4 group-[.toaster]:border-l-[var(--q-status-green)]",
          warning:
            "group-[.toaster]:border-l-4 group-[.toaster]:border-l-[var(--q-status-orange)]",
          error:
            "group-[.toaster]:border-l-4 group-[.toaster]:border-l-[var(--q-status-red)]",
          info:
            "group-[.toaster]:border-l-4 group-[.toaster]:border-l-[var(--q-accent-primary)]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
