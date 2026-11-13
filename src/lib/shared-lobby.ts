import type { AppLocale } from "@/lib/i18n/locale";
import { translator } from "@/lib/i18n/translator";
import type { Database } from "@/lib/supabase/database.types";

/** Resumen público de un grupo compartido (lo que devuelve `shared_lobby`). */
export type SharedLobby = Database["public"]["Functions"]["shared_lobby"]["Returns"][number];

/** Servidor, idioma y objetivo, si los tiene. */
export function sharedExtras(l: SharedLobby, locale: AppLocale = "es"): string[] {
  return [l.region, ...optionLabels(l, locale)].filter((x): x is string => Boolean(x));
}

/** Idioma y objetivo con su texto (o el código tal cual si no se conoce). */
function optionLabels(l: SharedLobby, locale: AppLocale): (string | null)[] {
  const t = translator(locale, "options");
  const label = (group: "languages" | "goals", v: string | null) =>
    v ? (t.has(`${group}.${v}` as never) ? t(`${group}.${v}` as never) : v) : null;
  return [label("languages", l.language), label("goals", l.goal)];
}

/** Frase corta del grupo: «TrioQ de VALORANT · busca Controlador · Platino a Diamante». */
export function sharedSummary(l: SharedLobby, locale: AppLocale = "es") {
  const t = translator(locale, "shared");
  const free = Math.max(0, l.slots - l.taken);
  const parts = [
    t("modeOf", { mode: l.mode_name, game: l.game_name }),
    l.status === "open" ? t("free", { count: free }) : l.status === "full" ? t("full") : t("closed"),
    l.roles.length ? t("looking", { roles: l.roles.join(", ") }) : null,
    l.rank_min || l.rank_max ? t("rankRange", { min: l.rank_min ?? "—", max: l.rank_max ?? "—" }) : null,
    l.region,
    ...optionLabels(l, locale),
  ];
  return parts.filter(Boolean).join(" · ");
}
