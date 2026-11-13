import { z } from "zod";
import type { AppLocale } from "./i18n/locale";
import { errorMessage, translator } from "./i18n/translator";

/** Versión del texto de permiso que acepta el artista (se guarda con cada envío). Si cambia el texto, cambia la versión. */
export const FANART_LICENSE_VERSION = "fanart-v1-2026-11-13";

// El texto del permiso está en messages/*.json (fanart.license); la versión vinculante es la española.

export { FANART_MAX_BYTES, FANART_TYPES } from "./limits";

/** Esquema del envío de fanart con los mensajes en el idioma pedido. */
export function fanartSchemaFor(locale: AppLocale) {
  const t = translator(locale, "validation.fanart");
  const text = (min: number, max: number, field: "title" | "artist") =>
    z
      .string()
      .trim()
      .min(min, t("min", { field, min }))
      .max(max, t("max", { field, max }))
      .regex(/^[^<>]*$/, t("chars", { field }));
  return z.object({
    game: z.string().regex(/^[a-z0-9-]{2,32}$/),
    title: text(2, 60, "title"),
    artist: text(2, 60, "artist"),
    portfolio: z.preprocess(
      (v) => (typeof v === "string" ? v.trim() : v) || null,
      z
        .string()
        .regex(/^https:\/\/[^\s<>"]{4,200}$/, t("portfolio"))
        .nullable(),
    ),
    path: z.string().regex(/^[0-9a-f-]{36}\/[A-Za-z0-9_-]{1,80}\.(png|jpg|jpeg|webp)$/, t("path")),
    license: z.literal("on", { message: t("license") }),
  });
}

export const fanartSchema = fanartSchemaFor("es");

export function fanartError(hint?: string | null, locale: AppLocale = "es"): string {
  return errorMessage("fanart", hint, locale);
}

/** Estados de un envío (textos en options.fanartStatus). */
export const FANART_STATUS = { pending: "pending", approved: "approved", rejected: "rejected", withdrawn: "withdrawn" } as const;

/** URL pública de una imagen del bucket de fanart (las cartas aprobadas la usan tal cual). */
export function isFanartUrl(url: string) {
  return url.includes("/storage/v1/object/public/fanart/");
}
