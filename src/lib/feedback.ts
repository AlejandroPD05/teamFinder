import { z } from "zod";
import type { AppLocale } from "./i18n/locale";
import { translator } from "./i18n/translator";

export const FEEDBACK_KINDS = ["idea", "bug", "other"] as const;

/** Sugerencia del buzón: tipo, texto (10–1000, sin < ni >) y la página desde la que se escribe (opcional). */
export function feedbackSchemaFor(locale: AppLocale = "es") {
  const t = translator(locale, "feedback.validation");
  return z.object({
    kind: z.enum(FEEDBACK_KINDS, { message: t("kind") }),
    body: z.string().trim().min(10, t("short")).max(1000, t("long")).regex(/^[^<>]*$/, t("chars")),
    page: z
      .string()
      .trim()
      .max(200)
      .regex(/^\/[^\s<>]*$/)
      .nullable()
      .catch(null),
  });
}
