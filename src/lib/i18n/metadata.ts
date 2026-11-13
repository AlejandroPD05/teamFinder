import "server-only";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Messages } from "./translator";

/** `generateMetadata` de una página con el título (titles.<key>) en el idioma de la petición. */
export function titled(key: keyof Messages["titles"], extra: Metadata = {}) {
  return async (): Promise<Metadata> => ({ ...extra, title: (await getTranslations("titles"))(key) });
}
