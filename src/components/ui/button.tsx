import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-button px-4 text-sm font-semibold tracking-[0] transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-white shadow-[0_4px_12px_rgba(37,99,235,0.24)] hover:bg-primary/95",
        secondary: "bg-primary-soft text-primary-dark hover:bg-primary-soft/80",
        outline: "border border-border bg-surface text-ink hover:bg-background",
        ghost: "text-ink-secondary hover:bg-background hover:text-ink",
        danger: "bg-danger text-white hover:bg-danger/90",
        success: "bg-success text-white shadow-[0_4px_12px_rgba(5,150,105,0.2)] hover:bg-success/90",
        amber: "bg-warning text-white shadow-[0_4px_12px_rgba(217,119,6,0.2)] hover:bg-warning/90"
      },
      size: {
        sm: "h-9 px-3 text-xs",
        default: "h-11 px-4 text-sm",
        lg: "h-12 px-5 text-sm"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
