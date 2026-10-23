"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input, type InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Password field with an eye button to show/hide what was typed. */
export const PasswordInput = React.forwardRef<HTMLInputElement, Omit<InputProps, "type">>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);
    return (
      <div className="relative">
        <Input ref={ref} type={visible ? "text" : "password"} className={cn("pr-11", className)}
          autoCapitalize="none" autoCorrect="off" spellCheck={false} {...props} />
        <button type="button" onClick={() => setVisible(v => !v)}
          aria-label={visible ? "Sembunyikan kata sandi" : "Lihat kata sandi"} aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-ink-tertiary hover:text-ink">
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";
