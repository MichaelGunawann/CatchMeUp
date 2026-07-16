import { redirect } from "next/navigation";
import { ProductApp } from "@/components/product-app";

type PageProps = {
  params: Promise<{
    path?: string[];
  }>;
};

/**
 * Production-safety gate for the legacy mock UI.
 *
 * This catch-all only ever handles paths with no dedicated route file -
 * i.e. the bare `/` root and the legacy demo screens still backed by
 * mock data (src/lib/db), not real Supabase queries (e.g. /teacher/materials,
 * /student/simulator, /admin/schools, ...). Real, Supabase-backed pages
 * (/login, /register, /dashboard, /teacher/dashboard, /student/dashboard,
 * /parent/dashboard, /admin/dashboard, /api/*) all have their own page/route
 * files, which Next.js always matches before falling through to this
 * catch-all, so none of them are affected by this gate.
 *
 * ENABLE_LEGACY_DEMO is a server-only env var (no NEXT_PUBLIC_ prefix, so
 * it never reaches the client bundle). Any real deployment that leaves it
 * unset redirects to /login before the legacy UI or its JS is ever sent to
 * the client - this is a server-side redirect, so it applies identically
 * whether the visitor is authenticated or not. An authenticated visitor
 * bounced here is then carried on to /dashboard -> their real role
 * dashboard by the session check already built into the login page
 * (src/app/(auth)/login/page.tsx), so no separate role-boundary logic is
 * needed here.
 *
 * Setting ENABLE_LEGACY_DEMO=true opts back into the pre-existing
 * behavior (full legacy mock UI, still wrapped in the "Data demo" banner
 * from AppShell) for local development / demoing only - this must never
 * be set in a real deployment's environment configuration.
 */
export default async function Page({ params }: PageProps) {
  if (process.env.ENABLE_LEGACY_DEMO !== "true") {
    redirect("/login");
  }

  const resolvedParams = await params;
  return <ProductApp path={resolvedParams.path ?? []} />;
}
