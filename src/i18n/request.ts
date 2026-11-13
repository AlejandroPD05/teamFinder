import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, pickLocale } from "@/lib/i18n/locale";
import { MESSAGES } from "@/lib/i18n/translator";

// next-intl sin rutas por idioma: el idioma sale de la cookie `tf_lang` o, si no hay, de Accept-Language.
export default getRequestConfig(async () => {
  const [jar, head] = await Promise.all([cookies(), headers()]);
  const locale = pickLocale(jar.get(LOCALE_COOKIE)?.value, head.get("accept-language"));
  return { locale, messages: MESSAGES[locale], timeZone: "Europe/Madrid" };
});
