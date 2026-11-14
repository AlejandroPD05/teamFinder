import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { titled } from "@/lib/i18n/metadata";
import { createClient } from "@/lib/supabase/server";
import { FeedbackForm } from "./forms";

export const generateMetadata = titled("feedback", { robots: { index: false } });

/** Buzón de sugerencias: ideas, errores u otras cosas. Lo lee moderación. */
export default async function FeedbackPage({ searchParams }: PageProps<"/sugerencias">) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/entrar?next=/sugerencias");
  const raw = (await searchParams).desde;
  const from = typeof raw === "string" && /^\/[^\s<>]{0,199}$/.test(raw) ? raw : null;
  const t = await getTranslations("feedback");
  return (
    <section className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">{t("title")}</h1>
        <p className="text-muted">{t("lead")}</p>
      </div>
      <FeedbackForm page={from} />
      <p className="text-xs text-muted">{t("privacy")}</p>
    </section>
  );
}
