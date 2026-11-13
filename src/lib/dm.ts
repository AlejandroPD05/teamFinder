import type { AppLocale } from "@/lib/i18n/locale";
import { errorMessage } from "@/lib/i18n/translator";

/** Mensajes privados: textos de error de las funciones de la base de datos (pista `hint`), en errors.dm. */
export const dmError = (hint?: string | null, locale: AppLocale = "es") => errorMessage("dm", hint, locale);

export { DM_MAX } from "./limits";
