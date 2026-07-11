import * as React from "react";
import { cn } from "@/lib/utils";

type ProgressProps = React.HTMLAttributes<HTMLDivElement> & {
  value: number;
  tone?: "primary" | "success" | "warning" | "danger";
};

const toneClass = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger"
};

export function Progress({ className, value, tone = "primary", ...props }: ProgressProps) {
  return (
    <div
      className={cn("h-2 overflow-hidden rounded-full bg-background", className)}
      {...props}
    >
      <div
        className={cn("h-full rounded-full transition-all", toneClass[tone])}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
