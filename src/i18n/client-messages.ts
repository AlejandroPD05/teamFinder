import type { Messages } from "@/lib/i18n/translator";

/**
 * Espacios de nombres de messages/*.json que usan los componentes de cliente (`useTranslations` en archivos
 * "use client" o en lo que importan). Solo estos viajan al navegador (unos 27 KB de 49 KB en español): el resto de
 * textos se traduce en el servidor y no hace falta mandarlo en cada página. tests/unit/client-messages.test.ts
 * comprueba que no falte ninguno: si un componente de cliente usa uno nuevo, añádelo aquí.
 */
export const CLIENT_NAMESPACES = [
  "availableNow",
  "chat",
  "clips",
  "errors",
  "fanart",
  "feedback",
  "gamePicker",
  "invite",
  "liveAlerts",
  "lobby",
  "lobbyForm",
  "matches",
  "messages",
  "missions",
  "nav",
  "notifications",
  "options",
  "playerShare",
  "profileForm",
  "push",
  "savedSearches",
  "settings",
  "share",
  "teamEvents",
  "teams",
  "templates",
  "trust",
  "welcome",
] as const satisfies readonly (keyof Messages)[];

/** Solo los textos que necesitan los componentes de cliente (para `NextIntlClientProvider`). */
export function clientMessages(messages: Messages): Pick<Messages, (typeof CLIENT_NAMESPACES)[number]> {
  return Object.fromEntries(CLIENT_NAMESPACES.map((ns) => [ns, messages[ns]])) as Pick<
    Messages,
    (typeof CLIENT_NAMESPACES)[number]
  >;
}
