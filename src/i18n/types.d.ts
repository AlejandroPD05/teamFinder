import type { AppLocale } from "@/lib/i18n/locale";
import type { Messages } from "@/lib/i18n/translator";

// Claves de traducción tipadas: un `t("...")` con una clave que no existe en messages/es.json no compila.
declare module "next-intl" {
  interface AppConfig {
    Locale: AppLocale;
    Messages: Messages;
  }
}
