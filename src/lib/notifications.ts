import type { AppLocale } from "./i18n/locale";
import { translator } from "./i18n/translator";
import { notificationLink, type NotificationLike } from "./notification-links";

/** Texto y enlace de cada notificación. `actor` es el nombre visible de quien la provoca (null si no se dice). */
export function notificationText(
  n: NotificationLike,
  actor: string | null,
  locale: AppLocale = "es",
): { title: string; detail: string | null; href: string | null } {
  const t = translator(locale, "notifications");
  const who = actor ?? t("someone");
  return { title: t(`title.${n.kind}`, { who }), ...notificationLink(n) };
}
