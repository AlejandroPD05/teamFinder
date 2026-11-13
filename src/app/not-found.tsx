import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <section className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <h1 className="font-display text-3xl font-semibold">{t("title")}</h1>
      <p className="text-muted">{t("text")}</p>
      <Link href="/" className="btn-ghost">
        {t("back")}
      </Link>
    </section>
  );
}
