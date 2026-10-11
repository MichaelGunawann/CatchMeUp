// One consistent colour + emoji per subject, used everywhere a subject
// appears (ujian, materi, latihan, beranda) so students recognise a subject
// at a glance instead of reading every label. Colour is never the only cue:
// the subject name is always shown next to it.
//
// Class strings are written out in full (not built dynamically) so Tailwind
// keeps them in the production CSS.

export type SubjectStyle = {
  emoji: string;
  /** solid swatch (dots, left borders) */
  solid: string;
  /** soft background + readable text, for chips/badges */
  soft: string;
  /** left accent border for cards */
  accent: string;
  /** selected-chip style */
  active: string;
};

const PALETTE: Record<string, SubjectStyle> = {
  blue:    { emoji: "🔢", solid: "bg-blue-500",    soft: "bg-blue-50 text-blue-700 border-blue-200",       accent: "border-l-blue-500",    active: "bg-blue-600 text-white border-blue-600" },
  emerald: { emoji: "🔬", solid: "bg-emerald-500", soft: "bg-emerald-50 text-emerald-700 border-emerald-200", accent: "border-l-emerald-500", active: "bg-emerald-600 text-white border-emerald-600" },
  amber:   { emoji: "🌏", solid: "bg-amber-500",   soft: "bg-amber-50 text-amber-800 border-amber-200",     accent: "border-l-amber-500",   active: "bg-amber-500 text-white border-amber-500" },
  rose:    { emoji: "📖", solid: "bg-rose-500",    soft: "bg-rose-50 text-rose-700 border-rose-200",       accent: "border-l-rose-500",    active: "bg-rose-600 text-white border-rose-600" },
  violet:  { emoji: "🗣️", solid: "bg-violet-500",  soft: "bg-violet-50 text-violet-700 border-violet-200", accent: "border-l-violet-500",  active: "bg-violet-600 text-white border-violet-600" },
  orange:  { emoji: "⚽", solid: "bg-orange-500",  soft: "bg-orange-50 text-orange-700 border-orange-200", accent: "border-l-orange-500",  active: "bg-orange-500 text-white border-orange-500" },
  teal:    { emoji: "🕌", solid: "bg-teal-500",    soft: "bg-teal-50 text-teal-700 border-teal-200",       accent: "border-l-teal-500",    active: "bg-teal-600 text-white border-teal-600" },
  red:     { emoji: "🇮🇩", solid: "bg-red-500",     soft: "bg-red-50 text-red-700 border-red-200",          accent: "border-l-red-500",     active: "bg-red-600 text-white border-red-600" },
  pink:    { emoji: "🎨", solid: "bg-pink-500",    soft: "bg-pink-50 text-pink-700 border-pink-200",       accent: "border-l-pink-500",    active: "bg-pink-600 text-white border-pink-600" },
  cyan:    { emoji: "💻", solid: "bg-cyan-500",    soft: "bg-cyan-50 text-cyan-700 border-cyan-200",       accent: "border-l-cyan-500",    active: "bg-cyan-600 text-white border-cyan-600" },
  lime:    { emoji: "🌱", solid: "bg-lime-500",    soft: "bg-lime-50 text-lime-800 border-lime-200",       accent: "border-l-lime-500",    active: "bg-lime-600 text-white border-lime-600" },
  slate:   { emoji: "📘", solid: "bg-slate-500",   soft: "bg-slate-100 text-slate-700 border-slate-200",   accent: "border-l-slate-500",   active: "bg-slate-700 text-white border-slate-700" },
};

// Common Indonesian SD/SMP/SMA subject names -> palette key.
const KNOWN: Array<[RegExp, keyof typeof PALETTE, string?]> = [
  [/matematika|mtk/i, "blue", "🔢"],
  [/ipas|ipa|sains|fisika|kimia|biologi/i, "emerald", "🔬"],
  [/ips|sejarah|geografi|ekonomi|sosiologi/i, "amber", "🌏"],
  [/bahasa indonesia|b\.? ?indo/i, "rose", "📖"],
  [/inggris|english/i, "violet", "🗣️"],
  [/bahasa|jawa|sunda|arab|mandarin/i, "violet", "🗣️"],
  [/pjok|olahraga|penjas/i, "orange", "⚽"],
  [/agama|pai|religi/i, "teal", "🕌"],
  [/pancasila|pkn|ppkn|kewarganegaraan/i, "red", "🇮🇩"],
  [/seni|sbdp|musik|budaya/i, "pink", "🎨"],
  [/informatika|tik|komputer/i, "cyan", "💻"],
  [/prakarya|muatan lokal|mulok/i, "lime", "🌱"],
];

const HASH_KEYS: Array<keyof typeof PALETTE> = ["blue", "emerald", "amber", "rose", "violet", "orange", "teal", "pink", "cyan", "lime"];

export function subjectStyle(name: string | null | undefined): SubjectStyle {
  const n = (name ?? "").trim();
  if (!n || n === "Umum") return PALETTE.slate;
  for (const [re, key, emoji] of KNOWN) {
    if (re.test(n)) return { ...PALETTE[key], emoji: emoji ?? PALETTE[key].emoji };
  }
  // Unknown subject: stable colour from its name.
  let h = 0;
  for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
  return PALETTE[HASH_KEYS[h % HASH_KEYS.length]];
}
