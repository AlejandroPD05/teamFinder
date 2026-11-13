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
