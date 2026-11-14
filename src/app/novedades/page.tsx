import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { CHANGELOG, formatChangelogDate, newestFirst } from "@/lib/changelog";
import { APP_NAME } from "@/lib/config";
import { INTL_LOCALE, OG_LOCALE } from "@/lib/i18n/locale";

// Novedades: lo que ha cambiado en la web, por fecha y de lo más reciente a lo más antiguo (src/lib/changelog.ts).

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("changelog"), getLocale()]);
  const title = t("metaTitle");
  const description = t("metaDescription", { app: APP_NAME });
  return {
    title,
    description,
    alternates: { canonical: "/novedades" },
    openGraph: { type: "website", siteName: APP_NAME, locale: OG_LOCALE[locale], title, description, url: "/novedades" },
  };
}

export default async function ChangelogPage() {
  const [t, locale] = await Promise.all([getTranslations("changelog"), getLocale()]);
  return (
    <article className="flex max-w-3xl flex-col gap-10">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-4xl font-bold leading-[1.1] sm:text-5xl">{t("title")}</h1>
        <p className="text-lg text-muted">{t("lead", { app: APP_NAME })}</p>
      </header>
      <ol className="flex flex-col gap-8">
        {newestFirst(CHANGELOG).map((entry) => (
          <li key={entry.date}>
            <section aria-labelledby={`d-${entry.date}`} className="flex flex-col gap-3">
              <h2 id={`d-${entry.date}`} className="font-display text-xl font-semibold">
                <time dateTime={entry.date}>{formatChangelogDate(entry.date, INTL_LOCALE[locale])}</time>
              </h2>
              <ul className="surface flex list-disc flex-col gap-2 py-5 pl-9 pr-5 marker:text-accent">
                {entry.items.map((item) => (
                  <li key={item.es}>{item[locale]}</li>
                ))}
              </ul>
            </section>
          </li>
        ))}
      </ol>
    </article>
  );
}
