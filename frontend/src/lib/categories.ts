export interface CategoryStyle {
  slug: string;
  label: string;
  color: string;
  bg: string;
}

/** Default categories; user-defined slugs fall back to generated pastels. */
export const DEFAULT_CATEGORIES: Record<string, CategoryStyle> = {
  class: { slug: "class", label: "수업", color: "#2563eb", bg: "#dbeafe" },
  ta: { slug: "ta", label: "조교", color: "#7c3aed", bg: "#ede9fe" },
  research: { slug: "research", label: "연구", color: "#16a34a", bg: "#dcfce7" },
  health: { slug: "health", label: "운동/치료", color: "#6b7280", bg: "#f3f4f6" },
  personal: { slug: "personal", label: "개인", color: "#ea580c", bg: "#ffedd5" },
  meeting: { slug: "meeting", label: "회의", color: "#0891b2", bg: "#cffafe" },
  outsourcing: { slug: "outsourcing", label: "외주", color: "#c026d3", bg: "#fae8ff" },
  other: { slug: "other", label: "기타", color: "#78716c", bg: "#f5f5f4" },
};

const FALLBACK_PALETTE = [
  { color: "#e85d04", bg: "#ffedd5" },
  { color: "#9d4edd", bg: "#f3e8ff" },
  { color: "#2a9d8f", bg: "#d1fae5" },
];

export function getCategoryStyle(slug: string): CategoryStyle {
  const known = DEFAULT_CATEGORIES[slug];
  if (known) return known;
  const hash = slug.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const p = FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length];
  return {
    slug,
    label: slug.replace(/_/g, " "),
    color: p.color,
    bg: p.bg,
  };
}
