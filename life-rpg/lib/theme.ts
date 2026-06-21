// Theme accent helpers. The accent color is driven by a CSS variable
// (--accent-rgb) so every Tailwind `accent` utility recolors at runtime.

export const ACCENT_PRESETS: { name: string; hex: string }[] = [
  { name: "Electric Blue", hex: "#38bdf8" },
  { name: "Amber", hex: "#fbbf24" },
  { name: "Emerald", hex: "#34d399" },
  { name: "Violet", hex: "#a78bfa" },
  { name: "Rose", hex: "#fb7185" },
  { name: "Cyan", hex: "#22d3ee" },
];

/** "#38bdf8" -> "56 189 248" (space-separated for rgb(var() / <alpha>)). */
export function hexToRgbTriplet(hex: string): string {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return "56 189 248";
  return `${r} ${g} ${b}`;
}
