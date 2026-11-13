import { getLocale, getTranslations } from "next-intl/server";
import { LEGAL } from "@/lib/legal";

/**
 * Normas y Privacidad solo existen en español, que es la versión vinculante. Con la web en otro idioma se avisa arriba
 * (en ese idioma) y se resume el contenido.
 */
export async function BindingNotice({ page }: { page: "rules" | "privacy" }) {
  const locale = await getLocale();
  if (locale === "es") return null;
  const t = await getTranslations("legalNotice");
  return (
    <div role="note" lang={locale} className="flex flex-col gap-2 rounded-lg border border-line bg-panel p-4 text-sm">
      <p className="font-semibold">{t("binding")}</p>
      <p className="text-muted">{t(page)}</p>
    </div>
  );
}

/** Versión vigente del texto (Normas y Privacidad). */
export function LegalVersion() {
  return (
    <p role="note" className="text-sm text-muted">
      Versión {LEGAL.version}, en vigor desde el {LEGAL.updated}. Si la cambiamos de forma importante, lo avisaremos en la
      web antes de aplicarla.
    </p>
  );
}

/** Correo de contacto del responsable, o «pendiente» mientras no esté configurado. */
export function ContactEmail() {
  return LEGAL.email ? (
    <a href={`mailto:${LEGAL.email}`} className="underline underline-offset-4">
      {LEGAL.email}
    </a>
  ) : (
    <strong>pendiente</strong>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="flex flex-col gap-2 text-sm leading-relaxed text-text [&_li]:ml-5 [&_li]:list-disc">{children}</div>
    </section>
  );
}
