import { GOALS, LANGUAGES } from "@/lib/profile/options";
import type { Database } from "@/lib/supabase/database.types";

/** Resumen público de un grupo compartido (lo que devuelve `shared_lobby`). */
export type SharedLobby = Database["public"]["Functions"]["shared_lobby"]["Returns"][number];

/** Servidor, idioma y objetivo, si los tiene. */
export function sharedExtras(l: SharedLobby): string[] {
  return [
    l.region,
    l.language ? (LANGUAGES[l.language as keyof typeof LANGUAGES] ?? l.language) : null,
    l.goal ? (GOALS[l.goal as keyof typeof GOALS] ?? l.goal) : null,
  ].filter((x): x is string => Boolean(x));
}

/** Frase corta del grupo: «TrioQ de VALORANT · busca Controlador · Platino a Diamante». */
export function sharedSummary(l: SharedLobby) {
  const free = Math.max(0, l.slots - l.taken);
  const parts = [
    `${l.mode_name} de ${l.game_name}`,
    l.status === "open" ? `${free} ${free === 1 ? "plaza libre" : "plazas libres"}` : l.status === "full" ? "completo" : "cerrado",
    l.roles.length ? `busca ${l.roles.join(", ")}` : null,
    l.rank_min || l.rank_max ? `${l.rank_min ?? "—"} a ${l.rank_max ?? "—"}` : null,
    l.region,
    l.language ? (LANGUAGES[l.language as keyof typeof LANGUAGES] ?? l.language) : null,
    l.goal ? (GOALS[l.goal as keyof typeof GOALS] ?? l.goal) : null,
  ];
  return parts.filter(Boolean).join(" · ");
}
