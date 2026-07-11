import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-[4px] px-2 py-0.5 text-[11px] font-semibold leading-4 tracking-tight whitespace-nowrap",
  {
    variants: {
      tone: {
        primary: "bg-primary-soft text-primary-dark",
        success: "bg-success-light text-success",
        warning: "bg-warning-light text-warning",
        danger: "bg-danger-light text-danger",
        neutral: "border border-border bg-background text-ink-secondary"
      }
    },
    defaultVariants: {
      tone: "neutral"
    }
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ tone, className }))} {...props} />;
}
