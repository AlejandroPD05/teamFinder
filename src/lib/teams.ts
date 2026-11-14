import { z } from "zod";
import type { AppLocale } from "./i18n/locale";
import { errorMessage, translator } from "./i18n/translator";

// Equipos persistentes (migración 20261117000000): por juego, con dueño, hasta 10 miembros y chat propio.

export const TEAM_MAX_MEMBERS = 10;

/** Esquema del formulario de equipo con los mensajes en el idioma pedido. */
export function teamSchemaFor(locale: AppLocale) {
  const t = translator(locale, "validation.team");
  return z.object({
    name: z
      .string()
      .trim()
      .min(3, t("nameMin"))
      .max(32, t("nameMax"))
      .regex(/^[^<>]+$/, t("nameChars")),
    description: z
      .string()
      .trim()
      .max(200, t("descriptionMax"))
      .regex(/^[^<>]*$/, t("descriptionChars")),
  });
}

export const teamSchema = teamSchemaFor("es");

/** Textos de los códigos de error (errors.team; el de equipo completo repite TEAM_MAX_MEMBERS). */
export const teamError = (hint?: string | null, locale: AppLocale = "es") => errorMessage("team", hint, locale);

/** Franjas (entre semana / fin de semana × mañana, tarde, noche, madrugada) en el orden de la rejilla. */
export const SCHEDULE_DAYS = ["weekday", "weekend"] as const;
export const SCHEDULE_PARTS = ["morning", "afternoon", "evening", "night"] as const;

/**
 * Horario del equipo: cuántos miembros pueden en cada franja (solo cuenta a quien la indica y la deja ver; el
 * resto va en `hidden`). `best` son las franjas con más gente (al menos 2), para proponer quedada.
 */
export function teamSchedule(availabilities: (readonly string[] | null)[]) {
  const counts = new Map<string, number>();
  let shared = 0;
  for (const a of availabilities) {
    if (!a || a.length === 0) continue;
    shared++;
    for (const slot of new Set(a)) counts.set(slot, (counts.get(slot) ?? 0) + 1);
  }
  const max = Math.max(0, ...counts.values());
  const best = max >= 2 ? [...counts].filter(([, n]) => n === max).map(([s]) => s) : [];
  return { counts, shared, hidden: availabilities.length - shared, max, best };
}
