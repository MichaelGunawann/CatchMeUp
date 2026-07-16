// Groq's free tier has a daily token quota (not a per-minute rate limit) -
// hitting it is an expected, recurring event, not a bug. The Groq SDK throws
// an error with `status: 429` and an `error.error.message` describing the
// exact quota exceeded; every route here previously mapped this into a
// generic "Unknown error"/500, which reads to a user exactly like a crash.
// This surfaces the real, honest reason instead.
export function groqErrorResponse(err: unknown): { message: string; status: number } {
  const status = (err as { status?: number } | null)?.status;
  if (status === 429) {
    return {
      message: "Kuota AI harian sudah habis. Fitur AI akan aktif kembali beberapa jam lagi, atau upgrade paket Groq untuk kuota lebih besar.",
      status: 429,
    };
  }
  const message = err instanceof Error ? err.message : "Unknown error";
  return { message, status: 500 };
}
