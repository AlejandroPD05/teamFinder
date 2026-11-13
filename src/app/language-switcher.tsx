import { Languages } from "lucide-react";
import { getLocale } from "next-intl/server";
import { LOCALES } from "@/lib/i18n/locale";
import { setLocale } from "./idioma/actions";

// Cada idioma se nombra en su propia lengua (y con su `lang`), para que se encuentre aunque no se entienda el otro.
const NAMES = { es: "Español", en: "English" } as const;

/**
 * Selector de idioma (pie de página). Funciona sin JavaScript: es un formulario con un botón por idioma y el activo
 * marcado con aria-pressed. El nombre se pinta con CSS (`content: attr(data-label)`), que también da el nombre accesible
 * del botón: así «Español» del pie no se mezcla con el texto de la página (p. ej. el idioma «Español» de un perfil) al
 * buscar o copiar texto, ni en las pruebas que lo buscan.
 */
export async function LanguageSwitcher() {
  const locale = await getLocale();
  return (
    <form action={setLocale} className="flex flex-wrap items-center gap-1">
      <Languages aria-hidden="true" className="mr-1 size-4" />
      {LOCALES.map((l) => (
        <button
          key={l}
          type="submit"
          name="lang"
          value={l}
          lang={l}
          aria-pressed={l === locale}
          data-label={NAMES[l]}
          title={NAMES[l]}
          className={`inline-flex min-h-11 items-center rounded-md px-3 text-sm before:content-[attr(data-label)] ${
            l === locale ? "bg-panel text-text" : "text-muted hover:bg-panel hover:text-text"
          }`}
        />
      ))}
    </form>
  );
}
