"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
  LogOut,
  Search,
} from "lucide-react";
import { Dropdown } from "@/components/ui/dropdown";
import { Input } from "@/components/ui/input";
import {
  NavItem,
  studentNotifications,
  teacherNotifications,
  parentNotifications,
  adminNotifications,
} from "@/lib/db";
import { NotificationItem } from "@/components/product-primitives";
import { cn } from "@/lib/utils";

export type Role = "teacher" | "student" | "parent" | "admin";

const roleMeta: Record<Role, { label: string; user: string; initials: string; helper: string; color: string }> = {
  teacher: { label: "Konsol Guru", user: "Bu Ratna Dewi", initials: "RD", helper: "XI IPA 2 · Matematika", color: "bg-primary" },
  student: { label: "Ruang Belajar", user: "Andi Pratama", initials: "AP", helper: "XI IPA 2 · SMAN 1 Bandung", color: "bg-success" },
  parent: { label: "Portal Orang Tua", user: "Bpk. Hari Pratama", initials: "HP", helper: "Orang tua Andi Pratama", color: "bg-warning" },
  admin: { label: "Admin Platform", user: "Admin", initials: "AD", helper: "SMA Negeri 1 Bandung", color: "bg-ink-secondary" }
};

const roleNotifications = {
  teacher: teacherNotifications,
  student: studentNotifications,
  parent: parentNotifications,
  admin: adminNotifications
};

// ── Catch Up Logo ────────────────────────────────────────────────────────────
function CatchUpLogo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="Catch Up"
      className={className}
      draggable={false}
    />
  );
}

export function AppShell({
  role,
  nav,
  children
}: {
  role: Role;
  nav: NavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const meta = roleMeta[role];

  return (
    <div className="flex min-h-screen bg-background text-ink">
      {/* ── Sidebar ── */}
      <aside className="sticky top-0 hidden h-screen w-[256px] shrink-0 flex-col border-r border-border bg-surface lg:flex">
        {/* Brand */}
        <div className="flex shrink-0 flex-col items-center border-b border-border px-4 py-4 gap-1">
          <Link href={`/${role}/dashboard`} className="flex flex-col items-center">
            <CatchUpLogo className="w-[10vw] max-w-[140px] min-w-[80px] object-contain drop-shadow-sm" />
          </Link>
          <div className="text-[10px] font-semibold text-ink-tertiary tracking-wide">{meta.label}</div>
        </div>

        {/* Nav */}
        <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4" aria-label="Navigasi utama">
          {nav.map((item, index) => {
            const prevItem = nav[index - 1];
            const showGroupHeader = item.group && item.group !== prevItem?.group;
            const active = pathname === item.href;
            const Icon = item.icon;

            return (
              <React.Fragment key={item.href}>
                {showGroupHeader && (
                  <div className={cn("px-2 pb-1", index === 0 ? "pt-4" : "pt-5")}>
                    <span className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-tertiary">
                      {item.group}
                    </span>
                  </div>
                )}
                {!showGroupHeader && index === 0 && <div className="pt-3" />}
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex h-[34px] items-center gap-2.5 rounded-[6px] px-2.5 text-[13px] font-medium transition-all duration-150",
                    active
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-ink-secondary hover:bg-ink/[0.05] hover:text-ink"
                  )}
                >
                  {active && (
                    <span className="absolute left-3 h-[18px] w-[3px] rounded-full bg-primary" aria-hidden="true" />
                  )}
                  <Icon
                    className={cn(
                      "h-[15px] w-[15px] shrink-0 transition-colors",
                      active ? "text-primary" : "text-ink-tertiary group-hover:text-ink-secondary"
                    )}
                    aria-hidden="true"
                  />
                  <span className="truncate">{item.title}</span>
                </Link>
              </React.Fragment>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="shrink-0 border-t border-border p-3">
          <Dropdown
            align="end"
            panelClassName="w-52"
            trigger={({ toggle, open }) => (
              <button
                type="button"
                onClick={toggle}
                aria-haspopup="menu"
                aria-expanded={open}
                className="flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 transition hover:bg-background"
              >
                <div className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white",
                  meta.color
                )}>
                  {meta.initials}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <div className="truncate text-[12px] font-semibold text-ink">{meta.user}</div>
                  <div className="truncate text-[10px] text-ink-tertiary">{meta.helper.split("·")[0].trim()}</div>
                </div>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ink-tertiary" />
              </button>
            )}
          >
            <div className="px-3 py-2.5">
              <div className="text-[12px] font-semibold text-ink">{meta.user}</div>
              <div className="text-[11px] text-ink-secondary">{meta.label}</div>
            </div>
            <div className="my-1 h-px bg-border" />
            {(["teacher", "student", "parent", "admin"] as Role[])
              .filter(r => r !== role)
              .map(r => (
                <Link key={r} href={`/${r}/dashboard`}
                  className="flex items-center gap-2 rounded-[4px] px-3 py-2 text-[12px] text-ink-secondary transition hover:bg-background hover:text-ink"
                  role="menuitem">
                  <div className={cn("h-2 w-2 rounded-full", roleMeta[r].color)} />
                  {roleMeta[r].label}
                </Link>
              ))}
            <div className="my-1 h-px bg-border" />
            <Link
              href={`/${role}/login`}
              className="flex items-center gap-2 rounded-[4px] px-3 py-2 text-[12px] text-ink-secondary transition hover:bg-background hover:text-ink"
              role="menuitem"
            >
              <LogOut className="h-3.5 w-3.5" />
              Keluar
            </Link>
          </Dropdown>
        </div>
      </aside>

      {/* ── Main column ── */}
      <div className="min-w-0 flex-1 flex flex-col">
        {/* Top header */}
        <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur-sm">
          <div className="mx-auto flex h-[58px] max-w-[1400px] items-center justify-between gap-4 px-6">
            {/* Search */}
            <div className="hidden min-w-[240px] max-w-xs items-center gap-2 rounded-[8px] border border-border bg-background px-3 py-1.5 md:flex">
              <Search className="h-3.5 w-3.5 shrink-0 text-ink-tertiary" aria-hidden="true" />
              <Input
                type="search"
                aria-label="Cari materi, soal, dan siswa"
                className="h-5 border-0 bg-transparent p-0 text-[13px] shadow-none focus-visible:ring-0 placeholder:text-ink-tertiary"
                placeholder="Cari..."
              />
            </div>

            <div className="ml-auto flex items-center gap-2">
              {/* AI status badge */}
              <div className="hidden items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft px-2.5 py-1 sm:flex">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-primary" />
                </span>
                <span className="text-[11px] font-semibold text-primary-dark">AI aktif</span>
              </div>

              <NotificationsMenu role={role} />

              {/* User chip */}
              <Dropdown
                align="end"
                trigger={({ toggle, open }) => (
                  <button
                    type="button"
                    onClick={toggle}
                    aria-haspopup="menu"
                    aria-expanded={open}
                    className="flex items-center gap-2 rounded-button border border-border bg-surface px-2.5 py-1.5 transition hover:bg-background"
                  >
                    <div className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white",
                      meta.color
                    )}>
                      {meta.initials}
                    </div>
                    <span className="hidden text-[13px] font-semibold text-ink sm:block">{meta.user.split(" ").slice(0, 2).join(" ")}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-ink-tertiary" />
                  </button>
                )}
              >
                <div className="px-3 py-2.5">
                  <div className="text-[13px] font-semibold text-ink">{meta.user}</div>
                  <div className="text-[11px] text-ink-secondary">{meta.helper}</div>
                </div>
                <div className="my-1 h-px bg-border" />
                {(["teacher", "student", "parent", "admin"] as Role[])
                  .filter(r => r !== role)
                  .map(r => (
                    <Link key={r} href={`/${r}/dashboard`}
                      className="flex items-center gap-2 px-3 py-2 text-[12px] text-ink-secondary transition hover:bg-background hover:text-ink"
                      role="menuitem">
                      <div className={cn("h-2 w-2 rounded-full shrink-0", roleMeta[r].color)} />
                      {roleMeta[r].user.split(" ").slice(0, 2).join(" ")}
                    </Link>
                  ))}
                <div className="my-1 h-px bg-border" />
                <Link href={`/${role}/login`}
                  className="flex items-center gap-2 px-3 py-2 text-[12px] text-ink-secondary transition hover:bg-background hover:text-ink"
                  role="menuitem">
                  <LogOut className="h-3.5 w-3.5" />
                  Keluar
                </Link>
              </Dropdown>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 mx-auto w-full max-w-[1400px] px-6 py-7">{children}</main>
      </div>
    </div>
  );
}

function NotificationsMenu({ role }: { role: Role }) {
  const notifications = roleNotifications[role];
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Dropdown
      align="end"
      panelClassName="w-[380px] p-0"
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={unreadCount > 0 ? `${unreadCount} notifikasi belum dibaca` : "Notifikasi"}
          className="relative flex h-8 w-8 items-center justify-center rounded-button border border-border bg-surface text-ink-secondary transition hover:bg-background hover:text-ink"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </button>
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-[13px] font-semibold text-ink">Notifikasi</h3>
        {unreadCount > 0 && (
          <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-semibold text-danger">
            {unreadCount} baru
          </span>
        )}
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notifications.map(n => (
          <NotificationItem key={n.id} notification={n} />
        ))}
      </div>
      <div className="border-t border-border px-4 py-2.5 text-center">
        <Link
          href={`/${role}/notifications`}
          className="text-[12px] font-semibold text-primary hover:underline"
        >
          Lihat semua notifikasi
        </Link>
      </div>
    </Dropdown>
  );
}
