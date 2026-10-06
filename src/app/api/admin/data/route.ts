import { supabaseAdmin } from "@/lib/supabase/server";
import { effectiveStreak, jakartaDate } from "@/lib/gamification/award";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/data
 *
 * Real data for the admin Siswa / Asesmen / Analitik pages (previously
 * hardcoded mock rows). Scope is enforced here:
 *  - SCHOOL_ADMIN   -> only the schools in their school_admins rows
 *  - PLATFORM_ADMIN -> every school
 *
 * Body: { section: "students" | "assessments" | "analytics" }
 */

type Scope = { schoolIds: string[] | null }; // null = all schools

async function resolveScope(req: Request): Promise<Scope | Response> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return Response.json({ error: "Tidak diotorisasi" }, { status: 401 });
  const { data: authData, error } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
  if (error || !authData.user) return Response.json({ error: "Sesi tidak valid, silakan masuk ulang" }, { status: 401 });
  const { data: profile } = await supabaseAdmin
    .from("user_profiles").select("id, role").eq("auth_user_id", authData.user.id).single();
  if (profile?.role === "PLATFORM_ADMIN") return { schoolIds: null };
  if (profile?.role === "SCHOOL_ADMIN") {
    const { data } = await supabaseAdmin.from("school_admins").select("school_id").eq("user_profile_id", profile.id);
    return { schoolIds: (data ?? []).map(r => r.school_id as string) };
  }
  return Response.json({ error: "Hanya admin yang dapat mengakses data ini" }, { status: 403 });
}

// Applies the school scope to a query builder. (Typed loosely: the
// Supabase builder generics are too deep for a generic constraint.)
function scoped<T>(q: T, scope: Scope, col = "school_id"): T {
  if (scope.schoolIds === null) return q;
  // A school admin with no linked school must see nothing, not everything.
  const ids = scope.schoolIds.length ? scope.schoolIds : ["00000000-0000-0000-0000-000000000000"];
  return (q as unknown as { in: (c: string, v: string[]) => T }).in(col, ids);
}

export async function POST(req: Request) {
  try {
    const scope = await resolveScope(req);
    if (scope instanceof Response) return scope;
    const { section } = (await req.json()) as { section?: string };

    const { data: schoolRows } = await scoped(supabaseAdmin.from("schools").select("id, name"), scope, "id");
    const schoolName = new Map((schoolRows ?? []).map(s => [s.id as string, s.name as string]));

    if (section === "students") {
      const { data: rows } = await scoped(
        supabaseAdmin.from("students")
          .select("id, nis, status, school_id, xp, streak_days, last_active_date, classes(name), user_profiles(full_name)")
          .order("created_at", { ascending: false })
          .limit(1000),
        scope,
      );
      const students = (rows ?? []) as unknown as Array<{
        id: string; nis: string | null; status: string; school_id: string; xp: number; streak_days: number; last_active_date: string | null;
        classes: { name: string } | null; user_profiles: { full_name: string } | null;
      }>;
      const scoreBy = new Map<string, { sum: number; count: number }>();
      const ids = students.map(s => s.id);
      for (let i = 0; i < ids.length; i += 200) {
        const { data: attempts } = await supabaseAdmin
          .from("assessment_attempts").select("student_id, score")
          .in("student_id", ids.slice(i, i + 200)).in("status", ["submitted", "graded"]);
        for (const a of (attempts ?? []) as Array<{ student_id: string; score: number | null }>) {
          if (a.score == null) continue;
          const cur = scoreBy.get(a.student_id) ?? { sum: 0, count: 0 };
          cur.sum += Number(a.score); cur.count += 1;
          scoreBy.set(a.student_id, cur);
        }
      }
      return Response.json({
        students: students.map(s => {
          const sc = scoreBy.get(s.id);
          return {
            id: s.id,
            name: s.user_profiles?.full_name ?? "-",
            nis: s.nis,
            school: schoolName.get(s.school_id) ?? "-",
            className: s.classes?.name ?? null,
            status: s.status,
            avgScore: sc ? Math.round(sc.sum / sc.count) : null,
            assessments: sc?.count ?? 0,
            xp: s.xp,
            streak: effectiveStreak(s.streak_days, s.last_active_date),
            lastActiveDate: s.last_active_date,
          };
        }),
      });
    }

    if (section === "assessments") {
      const { data: rows } = await scoped(
        supabaseAdmin.from("assessments")
          .select("id, title, type, status, open_at, close_at, school_id, classes(name), subjects(name), user_profiles(full_name)")
          .order("created_at", { ascending: false })
          .limit(500),
        scope,
      );
      const list = (rows ?? []) as unknown as Array<{
        id: string; title: string; type: string | null; status: string; open_at: string | null; close_at: string | null; school_id: string;
        classes: { name: string } | null; subjects: { name: string } | null; user_profiles: { full_name: string } | null;
      }>;
      const stat = new Map<string, { count: number; sum: number }>();
      const ids = list.map(a => a.id);
      for (let i = 0; i < ids.length; i += 200) {
        const { data: attempts } = await supabaseAdmin
          .from("assessment_attempts").select("assessment_id, score")
          .in("assessment_id", ids.slice(i, i + 200)).in("status", ["submitted", "graded"]);
        for (const a of (attempts ?? []) as Array<{ assessment_id: string; score: number | null }>) {
          const cur = stat.get(a.assessment_id) ?? { count: 0, sum: 0 };
          cur.count += 1; cur.sum += Number(a.score ?? 0);
          stat.set(a.assessment_id, cur);
        }
      }
      return Response.json({
        assessments: list.map(a => {
          const s = stat.get(a.id);
          return {
            id: a.id, title: a.title, type: a.type, status: a.status,
            openAt: a.open_at, closeAt: a.close_at,
            school: schoolName.get(a.school_id) ?? "-",
            className: a.classes?.name ?? "-", subject: a.subjects?.name ?? "-",
            teacher: a.user_profiles?.full_name ?? "-",
            participants: s?.count ?? 0,
            avgScore: s && s.count ? Math.round(s.sum / s.count) : null,
          };
        }),
      });
    }

    if (section === "analytics") {
      const today = jakartaDate(0);
      const since = new Date(Date.now() - 13 * 86400000);
      since.setUTCHours(0, 0, 0, 0);
      const [{ data: students }, { count: teacherCount }, { data: assessments }] = await Promise.all([
        scoped(supabaseAdmin.from("students").select("id, school_id, last_active_date").eq("status", "ACTIVE"), scope),
        scoped(supabaseAdmin.from("teachers").select("id", { count: "exact", head: true }).eq("status", "ACTIVE"), scope),
        scoped(supabaseAdmin.from("assessments").select("id, school_id").eq("status", "published"), scope),
      ]);
      const studentList = (students ?? []) as Array<{ id: string; school_id: string; last_active_date: string | null }>;
      const studentSchool = new Map(studentList.map(s => [s.id, s.school_id]));
      const studentIds = studentList.map(s => s.id);

      const graded: Array<{ student_id: string; score: number | null; submitted_at: string | null }> = [];
      const practice: Array<{ submitted_at: string }> = [];
      for (let i = 0; i < studentIds.length; i += 200) {
        const chunk = studentIds.slice(i, i + 200);
        const [{ data: a }, { data: p }] = await Promise.all([
          supabaseAdmin.from("assessment_attempts").select("student_id, score, submitted_at").in("student_id", chunk).in("status", ["submitted", "graded"]),
          supabaseAdmin.from("practice_attempts").select("submitted_at").in("student_id", chunk).gte("submitted_at", since.toISOString()),
        ]);
        graded.push(...((a ?? []) as typeof graded));
        practice.push(...((p ?? []) as typeof practice));
      }

      // Learning activity per WIB day for the last 14 days.
      const days = Array.from({ length: 14 }, (_, i) => jakartaDate(i - 13));
      const perDay = new Map(days.map(d => [d, 0]));
      const toDay = (iso: string) => new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`).toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
      for (const p of practice) { const d = toDay(p.submitted_at); if (perDay.has(d)) perDay.set(d, perDay.get(d)! + 1); }
      for (const g of graded) { if (!g.submitted_at) continue; const d = toDay(g.submitted_at); if (perDay.has(d)) perDay.set(d, perDay.get(d)! + 1); }

      const scores = graded.filter(g => g.score != null).map(g => Number(g.score));
      const bySchool = new Map<string, { sum: number; count: number }>();
      for (const g of graded) {
        if (g.score == null) continue;
        const sid = studentSchool.get(g.student_id);
        if (!sid) continue;
        const cur = bySchool.get(sid) ?? { sum: 0, count: 0 };
        cur.sum += Number(g.score); cur.count += 1;
        bySchool.set(sid, cur);
      }

      return Response.json({
        analytics: {
          activeStudents: studentList.length,
          activeToday: studentList.filter(s => s.last_active_date === today).length,
          activeTeachers: teacherCount ?? 0,
          publishedAssessments: (assessments ?? []).length,
          gradedAttempts: graded.length,
          avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
          activity: days.map(d => ({ label: new Date(`${d}T00:00:00Z`).toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "UTC" }), value: perDay.get(d) ?? 0 })),
          schoolScores: [...bySchool.entries()]
            .map(([id, v]) => ({ label: schoolName.get(id) ?? "-", value: Math.round(v.sum / v.count) }))
            .sort((a, b) => b.value - a.value),
        },
      });
    }

    return Response.json({ error: "section tidak dikenal" }, { status: 400 });
  } catch (error) {
    console.error("Error loading admin data:", error);
    return Response.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
