// Logo de TeamFinder (aprobado el 2026-11-13, ver src/app/logo.tsx): dos chevrones encajados. Compartida por el logo de la web y el favicon.
export const LOGO_TOP = "M4 6 L16 14 L28 6 L28 12 L16 20 L4 12 Z";
export const LOGO_BOTTOM = "M4 16 L16 24 L28 16 L28 22 L16 30 L4 22 Z";
export const LOGO_MUTED = "#9ca0b4";
export const BRAND_ACCENT = "#8b5cf6";

/** Color de acento seguro para incrustarlo en un SVG (solo #rgb o #rrggbb). */
export function safeHex(value: string | null | undefined): string {
  return value && /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(value) ? value : BRAND_ACCENT;
}

/** El logo como SVG suelto (favicon). */
export function logoSvg(accent: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="2 4 28 28"><path d="${LOGO_TOP}" fill="${safeHex(accent)}"/><path d="${LOGO_BOTTOM}" fill="${LOGO_MUTED}"/></svg>`;
}
