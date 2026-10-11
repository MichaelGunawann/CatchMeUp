"use client";

import React, { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  Type,
  X,
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
import { AlertPanel, NotificationItem } from "@/components/product-primitives";
import { cn } from "@/lib/utils";
import { getCurrentProfile, signOut } from "@/lib/auth/session";
import { TEXT_SIZE_OPTIONS, useTextSize, type TextSize } from "@/lib/hooks/use-text-size";

export type Role = "teacher" | "student" | "parent" | "admin";

// Static, role-level chrome (label/color are not tied to any specific
// account). Per-user identity (name/initials) is resolved from the real
// signed-in Supabase session below — never hardcoded to a specific person.
const roleMeta: Record<Role, { label: string; color: string }> = {
  teacher: { label: "Konsol Guru", color: "bg-primary" },
  student: { label: "Ruang Belajar", color: "bg-success" },
  parent: { label: "Portal Orang Tua", color: "bg-warning" },
  admin: { label: "Admin Platform", color: "bg-ink-secondary" },
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/**
 * Resolves the real signed-in user's display identity from Supabase.
 * Falls back to a neutral "Guest" identity (never a specific fake named
 * person) when no session exists, e.g. for anonymous visitors browsing the
 * legacy demo screens, which remain reachable without login.
 */
function useCurrentIdentity() {
  const [identity, setIdentity] = useState<{ name: string; initials: string; role: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCurrentProfile()
      .then((profile) => {
        if (cancelled) return;
        if (profile) {
          setIdentity({ name: profile.full_name, initials: initialsFromName(profile.full_name), role: profile.role });
        } else {
          setIdentity(null);
        }
      })
      .catch(() => {
        if (!cancelled) setIdentity(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return identity;
}

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

function isNavActive(item: NavItem, pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === item.href || pathname.startsWith(item.href + "/")) return true;
  return (item.matches ?? []).some(m => pathname === m || pathname.startsWith(m + "/"));
}

/** Normal / Besar / Sangat Besar - lives in the account menu. */
function TextSizeControl({ value, onChange }: { value: TextSize; onChange: (s: TextSize) => void }) {
  return (
    <div className="px-3 py-2">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-ink-secondary">
        <Type className="h-3.5 w-3.5" />Ukuran teks
      </div>
      <div className="grid grid-cols-3 gap-1 rounded-[8px] bg-background p-1">
        {TEXT_SIZE_OPTIONS.map(o => (
          <button key={o.value} type="button" onClick={() => onChange(o.value)} aria-pressed={value === o.value}
            className={cn("rounded-[6px] px-1.5 py-1 text-[11px] font-semibold transition-colors",
              value === o.value ? "bg-surface text-primary shadow-sm" : "text-ink-secondary hover:text-ink")}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function NavLinks({ nav, pathname, onNavigate, spread }: { nav: NavItem[]; pathname: string | null; onNavigate?: () => void; spread?: boolean }) {
  return (
    <>
      {nav.map((item, index) => {
        const prevItem = nav[index - 1];
        const showGroupHeader = item.group && item.group !== prevItem?.group;
        const active = isNavActive(item, pathname);
        const Icon = item.icon;

        // Rich item (student nav): big icon, bold title, one-line hint.
        if (item.hint) {
          return (
            <Link key={item.href} href={item.href} scroll={false} onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group my-0.5 flex items-center gap-3 rounded-[12px] px-3 py-2 transition-colors",
                // Desktop sidebar: the six items share the full height
                // (bounded, so they never stretch absurdly or overflow).
                spread && "min-h-[58px] max-h-[92px] flex-1",
                active ? "bg-primary/10" : "hover:bg-ink/[0.05]",
              )}>
              <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] transition-colors",
                active ? "bg-primary text-white" : "bg-background text-ink-secondary group-hover:text-ink")}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className={cn("block text-[15px] font-bold leading-tight", active ? "text-primary" : "text-ink")}>{item.title}</span>
                <span className="block truncate text-[11px] leading-tight text-ink-tertiary mt-0.5">{item.hint}</span>
              </span>
            </Link>
          );
        }

        return (
          <React.Fragment key={item.href}>
            {showGroupHeader && (
              <div className={cn("px-2 pb-0.5", index === 0 ? "pt-2" : "pt-3")}>
                <span className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-tertiary">
                  {item.group}
                </span>
              </div>
            )}
            <Link
              href={item.href}
              scroll={false}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex h-9 items-center gap-2.5 rounded-[6px] px-2.5 text-[13px] font-medium transition-all duration-150",
                active
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-ink-secondary hover:bg-ink/[0.05] hover:text-ink"
              )}
            >
              {active && (
                <span className="absolute -left-1 h-[18px] w-[3px] rounded-full bg-primary" aria-hidden="true" />
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
    </>
  );
}

export function AppShell({
  role,
  nav,
  children,
  demoData = false,
}: {
  role: Role;
  nav: NavItem[];
  children: React.ReactNode;
  /**
   * Set to true for screens still backed by the legacy mock data layer
   * (src/lib/db) rather than real Supabase-backed queries, so real users
   * are never shown fabricated numbers/records without any indication
   * they aren't their actual account data.
   */
  demoData?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const identity = useCurrentIdentity();
  // "admin" is a single UI-level bucket covering two real, distinct DB
  // roles (SCHOOL_ADMIN and PLATFORM_ADMIN) - the static roleMeta label
  // can't tell them apart, so resolve the real one from the signed-in
  // session for that case specifically.
  const meta = role === "admin" && identity?.role === "SCHOOL_ADMIN"
    ? { ...roleMeta.admin, label: "Admin Sekolah" }
    : roleMeta[role];
  const displayName = identity?.name ?? "Tamu";
  const displayInitials = identity?.initials ?? "?";
  // SD students default to bigger text; everyone can change it per device.
  const [textSize, setTextSize] = useTextSize(role === "student" ? "besar" : "normal");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  useEffect(() => { setMobileNavOpen(false); }, [pathname]);
  const isStudent = role === "student";

  async function handleLogout() {
    try {
      await signOut();
    } catch {
      // Even if sign-out fails (e.g. no active session for an anonymous
      // demo visitor), still send the user to the login page.
    }
    router.push("/login");
  }

  // Preserve sidebar nav scroll position across navigation
  const navRef = useRef<HTMLElement>(null);
  const savedNavScroll = useRef(0);

  // Save scroll before navigation
  function saveNavScroll() {
    if (navRef.current) savedNavScroll.current = navRef.current.scrollTop;
  }

  // Restore scroll after pathname changes (after React reconciles)
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    // Use rAF to run after paint so browser doesn't override it
    const id = requestAnimationFrame(() => {
      nav.scrollTop = savedNavScroll.current;
    });
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-background text-ink">
      {/* ── Sidebar ── */}
      <aside className="sticky top-0 hidden h-screen w-[clamp(200px,18vw,280px)] shrink-0 flex-col border-r border-border bg-surface lg:flex">
        {/* Brand - fixed height (it used to scale with screen WIDTH, which
            pushed the menu off-screen on shorter laptops) */}
        {/* The logo is a detailed square illustration - it needs real size
            to be legible. Sized by viewport HEIGHT (not width) so it grows
            on tall screens without pushing the menu into a scroll on short
            laptops. */}
        <div className="flex shrink-0 flex-col items-center justify-center gap-1 border-b border-border px-4 py-3">
          <Link href={`/${role}/dashboard`} className="flex flex-col items-center gap-1" aria-label="Catch Up - Beranda">
            <CatchUpLogo className="h-[clamp(84px,17vh,150px)] w-auto object-contain drop-shadow-sm" />
            <span className="text-[11px] font-semibold tracking-wide text-ink-tertiary">{meta.label}</span>
          </Link>
        </div>

        {/* Nav */}
        <nav ref={navRef} onMouseDown={saveNavScroll}
          className={cn("min-h-0 flex-1 overflow-y-auto px-3 py-2", nav.some(i => i.hint) && "flex flex-col")}
          aria-label="Navigasi utama">
          <NavLinks nav={nav} pathname={pathname} spread />
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
                  {displayInitials}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <div className="truncate text-[12px] font-semibold text-ink">{displayName}</div>
                  <div className="truncate text-[10px] text-ink-tertiary">{meta.label}</div>
                </div>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ink-tertiary" />
              </button>
            )}
          >
            <div className="px-3 py-2.5">
              <div className="text-[12px] font-semibold text-ink">{displayName}</div>
              <div className="text-[11px] text-ink-secondary">{meta.label}</div>
            </div>
            <div className="my-1 h-px bg-border" />
            <TextSizeControl value={textSize} onChange={setTextSize} />
            <div className="my-1 h-px bg-border" />
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-[4px] px-3 py-2 text-[12px] text-ink-secondary transition hover:bg-background hover:text-ink"
              role="menuitem"
            >
              <LogOut className="h-3.5 w-3.5" />
              Keluar
            </button>
          </Dropdown>
        </div>
      </aside>

      {/* ── Main column ── */}
      <div className="min-w-0 flex-1 flex flex-col">
        {/* Top header */}
        <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur-sm">
          <div className="mx-auto flex h-14 max-w-[90rem] items-center justify-between gap-3 px-4 sm:px-6">
            {/* Mobile/tablet: the sidebar is hidden below lg, so the menu
                has to be reachable from here (students also get the bottom
                tab bar). */}
            <button type="button" onClick={() => setMobileNavOpen(true)} aria-label="Buka menu"
              className="flex h-9 w-9 items-center justify-center rounded-button border border-border bg-surface text-ink-secondary lg:hidden">
              <Menu className="h-4 w-4" />
            </button>
            <Link href={`/${role}/dashboard`} className="lg:hidden">
              <CatchUpLogo className="h-11 w-auto object-contain" />
            </Link>
            {/* Search */}
            <div className="hidden w-60 max-w-xs items-center gap-2 rounded-[8px] border border-border bg-background px-3 py-1.5 md:flex">
              <Search className="h-3.5 w-3.5 shrink-0 text-ink-tertiary" aria-hidden="true" />
              <Input
                type="search"
                aria-label="Cari materi, soal, dan siswa"
                className="h-5 border-0 bg-transparent p-0 text-[13px] shadow-none focus-visible:ring-0 placeholder:text-ink-tertiary"
                placeholder="Cari..."
              />
            </div>

            <div className="ml-auto flex items-center gap-2">
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
                      {displayInitials}
                    </div>
                    <span className="hidden text-[13px] font-semibold text-ink sm:block">{displayName.split(" ").slice(0, 2).join(" ")}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-ink-tertiary" />
                  </button>
                )}
              >
                <div className="px-3 py-2.5">
                  <div className="text-[13px] font-semibold text-ink">{displayName}</div>
                  <div className="text-[11px] text-ink-secondary">{meta.label}</div>
                </div>
                <div className="my-1 h-px bg-border" />
                <TextSizeControl value={textSize} onChange={setTextSize} />
                <div className="my-1 h-px bg-border" />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-ink-secondary transition hover:bg-background hover:text-ink"
                  role="menuitem"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Keluar
                </button>
              </Dropdown>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className={cn("flex-1 mx-auto w-full max-w-[90rem] px-4 py-5 sm:px-6", isStudent && "pb-24 lg:pb-5")}>
          {demoData && (
            <div className="mb-6">
              <AlertPanel tone="warning" title="Data demo">
                Halaman ini masih menggunakan data contoh (bukan data akun asli kamu) dan belum terhubung ke
                database. Jangan jadikan angka atau catatan di halaman ini sebagai acuan nyata.
              </AlertPanel>
            </div>
          )}
          {children}
        </main>
      </div>

      {/* ── Mobile/tablet menu drawer ── */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setMobileNavOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[min(85vw,300px)] flex-col bg-surface shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <CatchUpLogo className="h-8 w-auto object-contain" />
              <button type="button" onClick={() => setMobileNavOpen(false)} aria-label="Tutup menu"
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-secondary hover:bg-background">
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-2" aria-label="Navigasi utama">
              <NavLinks nav={nav} pathname={pathname} onNavigate={() => setMobileNavOpen(false)} />
            </nav>
            <div className="border-t border-border">
              <TextSizeControl value={textSize} onChange={setTextSize} />
              <button type="button" onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-3 text-[13px] text-ink-secondary hover:bg-background">
                <LogOut className="h-4 w-4" />Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Student bottom tab bar (phones/tablets) ── */}
      {isStudent && (
        <nav aria-label="Navigasi utama" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur-sm lg:hidden">
          <div className="mx-auto grid max-w-xl" style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}>
            {nav.map(item => {
              const active = isNavActive(item, pathname);
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}
                  className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold",
                    active ? "text-primary" : "text-ink-tertiary")}>
                  <span className={cn("flex h-8 w-12 items-center justify-center rounded-full", active && "bg-primary/10")}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  {item.title}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

function NotificationsMenu({ role }: { role: Role }) {
  const notifications = roleNotifications[role];
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Dropdown
      align="end"
      panelClassName="w-[23.75rem] p-0"
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
