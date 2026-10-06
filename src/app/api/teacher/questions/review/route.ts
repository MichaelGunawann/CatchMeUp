import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/teacher/questions/review
 *
 * Approve or reject questions in the "Tinjau Soal AI" queue.
 *
 * Why a service route instead of a direct client UPDATE: the `questions`
 * UPDATE/DELETE RLS policies (migrations 008/010) only allow the row's
 * original creator_id, so a teacher reviewing questions for a class+subject
 * they are assigned to - but that were generated under another account
 * (co-teacher, re-provisioned account, student practice top-up) - got a
 * silent zero-row update and the "Setujui" button appeared to do nothing.
 * Authorization here is the same rule the SELECT policy already uses:
 * the caller must have a teacher_assignments row for the question's
 * (class_id, subject_id).
 *
 * Body:
 *   { action: "approve", questions: Array<{ id, question, topic, difficulty, explanation, correctAnswer, options: {A,B,C,D} }> }
 *   { action: "reject", ids: string[] }
 */

type ApprovePayload = {
  id: string;
  question: string;
  topic: string;
  difficulty: string;
  explanation: string;
  correctAnswer: string;
  options: { A: string; B: string; C: string; D: string };
};

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ error: "Tidak diotorisasi" }, { status: 401 });
    }
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
    if (authError || !authData.user) {
      return Response.json({ error: "Sesi tidak valid, silakan masuk ulang" }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("id, role")
      .eq("auth_user_id", authData.user.id)
      .single();
    if (!profile || profile.role !== "TEACHER") {
      return Response.json({ error: "Hanya guru yang dapat meninjau soal" }, { status: 403 });
    }
    const { data: teacher } = await supabaseAdmin
      .from("teachers")
      .select("id, status")
      .eq("user_profile_id", profile.id)
      .single();
    if (!teacher || teacher.status !== "ACTIVE") {
      return Response.json({ error: "Akun guru belum aktif" }, { status: 403 });
    }

    const body = (await req.json()) as
      | { action: "approve"; questions?: ApprovePayload[] }
      | { action: "reject"; ids?: string[] };

    const ids = body.action === "approve" ? (body.questions ?? []).map(q => q.id) : body.action === "reject" ? body.ids ?? [] : [];
    if (ids.length === 0) {
      return Response.json({ error: "Tidak ada soal yang dipilih" }, { status: 400 });
    }

    const [{ data: rows }, { data: assignments }] = await Promise.all([
      supabaseAdmin.from("questions").select("id, class_id, subject_id, status").in("id", ids),
      supabaseAdmin.from("teacher_assignments").select("class_id, subject_id").eq("teacher_id", teacher.id),
    ]);
    const allowed = new Set((assignments ?? []).map(a => `${a.class_id}:${a.subject_id}`));
    const found = new Map((rows ?? []).map(r => [r.id as string, r]));

    for (const id of ids) {
      const row = found.get(id);
      if (!row) return Response.json({ error: "Soal tidak ditemukan (mungkin sudah ditinjau)" }, { status: 404 });
      if (!allowed.has(`${row.class_id}:${row.subject_id}`)) {
        return Response.json({ error: "Kamu tidak mengajar kelas/mapel untuk soal ini" }, { status: 403 });
      }
      if (row.status !== "pending") {
        return Response.json({ error: "Soal ini sudah ditinjau sebelumnya" }, { status: 409 });
      }
    }

    if (body.action === "reject") {
      // Pending-only hard delete, same invariant as migration 010: a
      // pending question was never used in any assessment/practice.
      const { error } = await supabaseAdmin.from("questions").delete().in("id", ids).eq("status", "pending");
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ success: true, count: ids.length });
    }

    for (const q of body.questions ?? []) {
      const question = q.question?.trim();
      const topic = q.topic?.trim();
      const opts = q.options ?? { A: "", B: "", C: "", D: "" };
      if (!question || !topic || !opts.A?.trim() || !opts.B?.trim() || !opts.C?.trim() || !opts.D?.trim()) {
        return Response.json({ error: "Pertanyaan, topik, dan pilihan A–D wajib diisi sebelum disetujui" }, { status: 400 });
      }
      const { error } = await supabaseAdmin
        .from("questions")
        .update({
          status: "active",
          question,
          topic,
          subtopic: topic,
          difficulty: ["Mudah", "Sedang", "Sulit"].includes(q.difficulty) ? q.difficulty : "Sedang",
          explanation: q.explanation ?? "",
          correct_answer: ["A", "B", "C", "D"].includes(q.correctAnswer) ? q.correctAnswer : "A",
          options: { A: opts.A.trim(), B: opts.B.trim(), C: opts.C.trim(), D: opts.D.trim() },
          updated_at: new Date().toISOString(),
        })
        .eq("id", q.id)
        .eq("status", "pending");
      if (error) return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, count: ids.length });
  } catch (error) {
    console.error("Error reviewing questions:", error);
    return Response.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
