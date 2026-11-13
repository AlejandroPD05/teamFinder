import { INTL_LOCALE, type AppLocale } from "@/lib/i18n/locale";
import { translator } from "@/lib/i18n/translator";

// Formato de fechas de grupos. La beta es para servidores EU: se muestran en hora peninsular española.
export function formatStart(iso: string | null, locale: AppLocale = "es"): string {
  const t = translator(locale, "lobbies");
  if (!iso) return t("now");
  const when = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    timeZone: "Europe/Madrid",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
  return t("startsAt", { when });
}
