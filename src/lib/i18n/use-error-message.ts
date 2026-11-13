import { useTranslations } from "next-intl";
import type { ErrorGroup } from "./translator";

/** En componentes de cliente: texto de un código de error (`hint`) de la base de datos, en el idioma de la página. */
export function useErrorMessage(group: ErrorGroup) {
  const t = useTranslations("errors");
  return (hint?: string | null) => {
    const key = `${group}.${hint}`;
    return hint && hint !== "fallback" && t.has(key as never) ? t(key as never) : t(`${group}.fallback` as never);
  };
}
