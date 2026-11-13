import { z } from "zod";
import { parseClipUrl } from "./links";
import type { AppLocale } from "@/lib/i18n/locale";
import { errorMessage, translator } from "@/lib/i18n/translator";

/** Esquemas de clips con los mensajes en el idioma pedido. */
export function postClipSchemaFor(locale: AppLocale) {
  const t = translator(locale, "validation.clip");
  return z.object({
  url: z
    .string()
    .trim()
    .max(300, t("urlMax"))
    .transform((u, ctx) => {
      const ref = parseClipUrl(u);
      if (!ref) {
        ctx.addIssue({ code: "custom", message: t("url") });
        return z.NEVER;
      }
      return ref;
    }),
  title: z
    .string()
    .trim()
    .min(3, t("titleMin"))
    .max(80, t("titleMax"))
    .regex(/^[^<>]+$/, t("titleChars")),
  emblem: z.uuid(t("emblem")),
  });
}

export const postClipSchema = postClipSchemaFor("es");

export function commentSchemaFor(locale: AppLocale) {
  const t = translator(locale, "validation.clip");
  return z.string().trim().min(1, t("commentMin")).max(300, t("commentMax"));
}

export const commentSchema = commentSchemaFor("es");

/** Mensajes para los errores de las funciones de la base de datos (pista `hint`, errors.clip). */
export function clipError(hint: string | undefined, locale: AppLocale = "es"): string {
  return errorMessage("clip", hint, locale);
}
