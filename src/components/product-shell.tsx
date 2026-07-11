"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
  LogOut,
  Search,
  Sparkles,
} from "lucide-react";
import { Dropdown } from "@/components/ui/dropdown";
import { Input } from "@/components/ui/input";
import {
  NavItem,
  studentNotifications,
  teacherNotifications,
  parentNotifications,
  adminNotifications
} from "@/lib/mock-data";
import { NotificationItem } from "@/components/product-primitives";
import { cn } from "@/lib/utils";

export type Role = "teacher" | "student" | "parent" | "admin";

const roleMeta: Record<Role, { label: string; user: string; initials: string; helper: string }> = {
  teacher: { label: "Konsol Guru", user: "Bu Ratna", initials: "BR", helper: "XI IPA 2 · Matematika" },
  student: { label: "Ruang Belajar", user: "Andi Pratama", initials: "AP", helper: "XI IPA 2 · SMA Negeri 1 Bandung" },
  parent: { label: "Portal Orang Tua", user: "Bpk. Hendra", initials: "BH", helper: "Orang tua dari Andi Pratama" },
  admin: { label: "Admin Sekolah", user: "Admin Sekolah", initials: "AS", helper: "SMA Negeri 1 Bandung" }
};

const roleNotifications = {
  teacher: teacherNotifications,
  student: studentNotifications,
  parent: parentNotifications,
  admin: adminNotifications
};

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
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-border bg-surface lg:flex">
        {/* Brand */}
        <div className="flex h-[54px] shrink-0 items-center border-b border-border px-4">
          <Link href={`/${role}/dashboard`} className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-primary text-[11px] font-bold text-white tracking-tight">
              CA
            </div>
            <div>
              <div className="text-[13px] font-bold leading-none text-ink">Catch Up</div>
              <div className="text-[10px] text-ink-tertiary mt-0.5">{meta.label}</div>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-2" aria-label="Navigasi utama">
          {nav.map((item, index) => {
            const prevItem = nav[index - 1];
            const showGroupHeader = item.group && item.group !== prevItem?.group;
            const active = pathname === item.href;
            const Icon = item.icon;

            return (
              <React.Fragment key={item.href}>
                {showGroupHeader && (
                  <div className={cn("px-2 pb-1", index === 0 ? "pt-4" : "pt-5")}>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary">
                      {item.group}
                    </span>
                  </div>
                )}
                {!showGroupHeader && index === 0 && <div className="pt-3" />}
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-8 items-center gap-2.5 rounded-[6px] px-2.5 text-[13px] font-medium transition-all",
                    active
                      ? "bg-primary/8 text-primary font-semibold"
                      : "text-ink-secondary hover:bg-ink/[0.04] hover:text-ink"
                  )}
                >
                  <Icon
                    className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-ink-tertiary")}
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
                className="flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-2 transition hover:bg-ink/[0.04]"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
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
            <Link
              href={`/${role}/login`}
              className="flex items-center gap-2 rounded-[4px] px-3 py-2 text-[13px] text-ink-secondary transition hover:bg-background hover:text-ink"
              role="menuitem"
            >
              <LogOut className="h-3.5 w-3.5" />
              Keluar
            </Link>
          </Dropdown>
        </div>
      </aside>

      {/* ── Main column ── */}
      <div className="min-w-0 flex-1">
        {/* Top header */}
        <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur-sm">
          <div className="mx-auto flex h-[54px] max-w-[1400px] items-center justify-between gap-4 px-6">
            {/* Search */}
            <div className="hidden min-w-[260px] max-w-sm items-center gap-2 rounded-[6px] border border-border bg-background px-3 py-1.5 text-sm text-ink-secondary md:flex">
              <Search className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <Input
                type="search"
                aria-label="Cari materi, soal, dan siswa"
                className="h-5 border-0 bg-transparent p-0 text-[13px] shadow-none focus-visible:ring-0 placeholder:text-ink-tertiary"
                placeholder="Cari..."
              />
            </div>

            {/* Right actions */}
            <div className="ml-auto flex items-center gap-2">
              {/* AI status */}
              <div className="hidden items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft px-2.5 py-1 sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[11px] font-semibold text-primary-dark">AI aktif</span>
              </div>

              {/* Notifications */}
              <NotificationsMenu role={role} />

              {/* User menu */}
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
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      {meta.initials}
                    </div>
                    <span className="hidden text-[13px] font-semibold text-ink sm:block">{meta.user}</span>
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
                  .filter((r) => r !== role)
                  .map((r) => (
                    <Link key={r} href={`/${r}/dashboard`}
                      className="flex items-center gap-2 px-3 py-2 text-[13px] text-ink-secondary transition hover:bg-background hover:text-ink"
                      role="menuitem">
                      Masuk sebagai {roleMeta[r].user.split(" ")[0]}
                    </Link>
                  ))}
                <div className="my-1 h-px bg-border" />
                <Link href={`/${role}/login`}
                  className="flex items-center gap-2 px-3 py-2 text-[13px] text-ink-secondary transition hover:bg-background hover:text-ink"
                  role="menuitem">
                  <LogOut className="h-3.5 w-3.5" />
                  Keluar
                </Link>
              </Dropdown>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="mx-auto max-w-[1400px] px-6 py-7">{children}</main>
      </div>
    </div>
  );
}

function NotificationsMenu({ role }: { role: Role }) {
  const notifications = roleNotifications[role];
  const unreadCount = notifications.filter((n) => !n.read).length;

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
          <span className="text-[11px] font-semibold text-primary">{unreadCount} baru</span>
        )}
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notifications.map((n) => (
          <NotificationItem key={n.id} notification={n} />
        ))}
      </div>
      <div className="border-t border-border px-4 py-2.5">
        <Link
          href={`/${role}/notifications`}
          className="block text-center text-[12px] font-semibold text-primary hover:underline"
        >
          Lihat semua notifikasi
        </Link>
      </div>
    </Dropdown>
  );
}
