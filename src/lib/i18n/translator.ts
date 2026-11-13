import { createTranslator, type NamespaceKeys, type NestedKeyOf } from "next-intl";
import en from "../../../messages/en.json";
import es from "../../../messages/es.json";
import type { AppLocale } from "./locale";

// Textos de la interfaz: messages/es.json (referencia) y messages/en.json, con las mismas claves.
export type Messages = typeof es;
// Si a en.json le falta una clave de es.json, esto no compila.
const english: Messages = en;
export const MESSAGES: Record<AppLocale, Messages> = { es, en: english };

type Namespace = NamespaceKeys<Messages, NestedKeyOf<Messages>>;

/**
 * Traductor fuera de React (helpers de src/lib, acciones de servidor, rutas). Por defecto en español, para que los
 * helpers sigan devolviendo el texto de siempre cuando no se les pasa idioma.
 */
export function translator<NS extends Namespace>(locale: AppLocale, namespace: NS) {
  return createTranslator({ locale, messages: MESSAGES[locale], namespace, timeZone: "Europe/Madrid" });
}

export type ErrorGroup = keyof Messages["errors"];

/** Clave del texto de un código de error (`hint`) de la base de datos; `fallback` si no tiene texto propio. */
export function errorKey(group: ErrorGroup, hint: string | null | undefined): string {
  const known = MESSAGES.es.errors[group] as Record<string, string>;
  return `${group}.${hint && hint !== "fallback" && Object.hasOwn(known, hint) ? hint : "fallback"}`;
}

/** Texto de un código de error (`hint`) de la base de datos, en el idioma pedido (español por defecto). */
export function errorMessage(group: ErrorGroup, hint: string | null | undefined, locale: AppLocale = "es"): string {
  return translator(locale, "errors")(errorKey(group, hint) as never);
}
