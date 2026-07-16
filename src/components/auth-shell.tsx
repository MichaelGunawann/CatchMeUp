import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared branded card layout for every auth screen (login, register,
 * parent registration, school registration) so they all share the same
 * visual language as the rest of the app (product-shell.tsx,
 * product-primitives.tsx) instead of ad-hoc gray/blue Tailwind.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  maxWidthClassName = "max-w-md",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidthClassName?: string;
}) {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-background px-4 py-10">
      <div className={cn("w-full", maxWidthClassName)}>
        <div className="mb-6 flex flex-col items-center">
          <Link href="/login" className="mb-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Catch Me Up"
              className="h-11 w-auto object-contain drop-shadow-sm"
              draggable={false}
            />
          </Link>
        </div>

        <div className="rounded-card border border-border bg-surface p-8 shadow-lg">
          <h1 className="text-[20px] font-bold text-ink text-center">{title}</h1>
          {subtitle && (
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-secondary text-center">
              {subtitle}
            </p>
          )}
          <div className="mt-6">{children}</div>
        </div>

        {footer && (
          <div className="mt-5 space-y-1.5 text-center text-[13px] text-ink-secondary">{footer}</div>
        )}
      </div>
    </div>
  );
}

export function AuthFieldLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-semibold text-ink">
      {children}
      {required && <span className="ml-0.5 text-danger">*</span>}
    </label>
  );
}
