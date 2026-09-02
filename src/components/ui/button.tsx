import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent text-[13px] font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/30 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-[var(--danger)] aria-invalid:ring-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]",
        outline:
          "border border-[var(--border)] bg-[var(--panel)] hover:bg-[var(--panel-muted)] text-[var(--text)]",
        secondary:
          "bg-[var(--panel-muted)] hover:bg-[var(--border)] text-[var(--text)]",
        ghost:
          "hover:bg-[var(--panel-muted)] text-[var(--text)]",
        destructive:
          "bg-[var(--danger)] text-white hover:bg-[var(--danger)]/90",
        link: "text-[var(--accent)] underline underline-offset-4 hover:underline",
      },
      size: {
        default: "h-[34px] gap-1.5 px-3.5",
        xs: "h-[26px] gap-1 px-2 text-[11px] [&_svg:not([class*='size-'])]:size-3",
        sm: "h-[30px] gap-1 px-3 text-[12px]",
        lg: "h-[38px] gap-2 px-5 text-[14px]",
        icon: "size-[34px]",
        "icon-xs": "size-[26px] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-[30px]",
        "icon-lg": "size-[38px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
