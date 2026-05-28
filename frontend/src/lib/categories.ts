import type { CategoryItem } from "@/types/schedule";

export interface CategoryStyle {
  slug: string;
  label: string;
  color: string;
  bg: string;
}

export const BUILTIN_SLUGS = new Set([
  "class",
  "ta",
  "research",
  "health",
  "personal",
  "meeting",
  "outsourcing",
  "other",
]);

/** Built-in defaults (overridden by user categories from store). */
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

let categoryRegistry: Record<string, CategoryStyle> = { ...DEFAULT_CATEGORIES };

export function slugifyCategory(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_가-힣-]/g, "");
  return base || `cat_${Date.now()}`;
}

export function categoryItemToStyle(item: CategoryItem): CategoryStyle {
  return {
    slug: item.slug,
    label: item.label,
    color: item.colorHex,
    bg: item.colorHex,
  };
}

export function setCategoryRegistry(items: CategoryItem[]) {
  categoryRegistry = { ...DEFAULT_CATEGORIES };
  for (const item of items) {
    categoryRegistry[item.slug] = categoryItemToStyle(item);
  }
}

export function getAllCategoryStyles(): CategoryStyle[] {
  return Object.values(categoryRegistry).sort((a, b) =>
    a.label.localeCompare(b.label, "ko"),
  );
}

export function getCategoryStyle(slug: string): CategoryStyle {
  const known = categoryRegistry[slug] ?? DEFAULT_CATEGORIES[slug];
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

export function defaultCategoryItems(): CategoryItem[] {
  return Object.values(DEFAULT_CATEGORIES).map((c, i) => ({
    slug: c.slug,
    label: c.label,
    colorHex: c.bg,
    sortOrder: i,
    isBuiltin: BUILTIN_SLUGS.has(c.slug),
  }));
}
