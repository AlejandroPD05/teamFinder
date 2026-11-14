// Idiomas de la interfaz. Sin rutas por idioma: se elige con la cookie `tf_lang` (selector del pie) y, si no hay,
// con la cabecera Accept-Language. El español es el idioma por defecto y la versión de referencia.

export const LOCALES = ["es", "en"] as const;
export type AppLocale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: AppLocale = "es";

export const LOCALE_COOKIE = "tf_lang";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Locale de los formateadores Intl (fechas y números) y de Open Graph. */
export const INTL_LOCALE: Record<AppLocale, string> = { es: "es-ES", en: "en-GB" };
export const OG_LOCALE: Record<AppLocale, string> = { es: "es_ES", en: "en_GB" };

// Lenguas de España: su público entiende la web en español antes que en inglés.
const SPANISH_LIKE = ["es", "ca", "gl", "eu"];

export function isLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Idioma preferido según Accept-Language: español si la primera preferencia es español; si no, inglés. Sin cabecera, español. */
export function localeFromAcceptLanguage(header: string | null | undefined): AppLocale {
  if (!header?.trim()) return DEFAULT_LOCALE;
  const ranked = header
    .split(",")
    .map((part, i) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { tag: tag.trim().toLowerCase(), q: q ? Number(q.slice(2)) : 1, i };
    })
    .filter((l) => l.tag && l.tag !== "*" && Number.isFinite(l.q) && l.q > 0)
    .sort((a, b) => b.q - a.q || a.i - b.i);
  if (!ranked.length) return DEFAULT_LOCALE;
  const first = ranked[0].tag.split("-")[0];
  return SPANISH_LIKE.includes(first) ? "es" : "en";
}

/** La cookie manda; si no hay una válida, la cabecera del navegador. */
export function pickLocale(cookie: string | null | undefined, acceptLanguage: string | null | undefined): AppLocale {
  return isLocale(cookie) ? cookie : localeFromAcceptLanguage(acceptLanguage);
}

/**
 * Idioma de los nombres del catálogo de los juegos (roles, modos, regiones): están en español también en la versión
 * inglesa. Con la página en otro idioma se marcan con `lang="es"` para que el lector de pantalla los pronuncie bien.
 */
export function catalogLang(locale: string): "es" | undefined {
  return locale === "es" ? undefined : "es";
}
