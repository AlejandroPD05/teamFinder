import type { CSSProperties } from "react";

/** Campos de tema de un juego (tabla `games`). */
export type GameTheme = {
  theme_accent: string | null;
  theme_accent_soft: string | null;
  theme_glow_b: string | null;
};

const tint = (hex: string, pct: number, base: string) => `color-mix(in srgb, ${hex} ${pct}%, ${base})`;

/**
 * Variables CSS del tema del juego: el acento y un tinte liso del fondo y los paneles con el tono oscuro del juego
 * (azul marino, pizarra…). Sin degradados. La paleta base es común a todos (prompt §17).
 * Se usa en el servidor (estilo de <html>) y en el cliente (cambio inmediato al elegir juego).
 */
export function themeStyle(game?: GameTheme | null): CSSProperties {
  if (!game?.theme_accent) return {};
  const t = game.theme_glow_b;
  return {
    "--color-accent": game.theme_accent,
    "--color-accent-soft": game.theme_accent_soft ?? game.theme_accent,
    ...(t && {
      "--color-bg": tint(t, 12, "#0b0c12"),
      "--color-bg-raised": tint(t, 12, "#10111a"),
      "--color-panel": tint(t, 14, "#151722"),
      "--color-panel-hover": tint(t, 16, "#1c1f2e"),
      "--color-line": tint(t, 16, "#2a2d3e"),
    }),
  } as CSSProperties;
}
