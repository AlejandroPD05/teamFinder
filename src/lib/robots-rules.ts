import { PROTECTED_PREFIXES } from "./config";

/**
 * Reglas `Disallow` de robots.txt. Una regla es un prefijo: `Disallow: /equipo` también bloqueaba `/equipos/...`
 * (las páginas públicas por juego y rol). Por eso cada ruta privada se bloquea solo exacta (`$`), con subrutas (`/`) o
 * con parámetros (`?`), y nunca como prefijo suelto.
 */
export function robotsDisallow(prefixes: readonly string[] = PROTECTED_PREFIXES): string[] {
  const exact = (p: string) => [`${p}$`, `${p}/`, `${p}?`];
  return [...prefixes.flatMap(exact), "/jugador/", "/auth/", ...exact("/entrar")];
}

/** Longitud de la regla si casa con la ruta (prefijo, con `$` como fin de URL), o -1. Sin comodines `*`. */
function matchLength(rule: string, path: string): number {
  if (rule.endsWith("$")) return path === rule.slice(0, -1) ? rule.length : -1;
  return path.startsWith(rule) ? rule.length : -1;
}

/** ¿Bloquean las reglas la ruta? Como Google: gana la regla más larga y, si empatan, `Allow`. */
export function isDisallowed(path: string, disallow: readonly string[], allow: readonly string[] = ["/"]): boolean {
  const d = Math.max(-1, ...disallow.map((r) => matchLength(r, path)));
  const a = Math.max(-1, ...allow.map((r) => matchLength(r, path)));
  return d > a;
}
