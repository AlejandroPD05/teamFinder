import { getLocale, getTranslations } from "next-intl/server";
import { INTL_LOCALE } from "@/lib/i18n/locale";
import { titled } from "@/lib/i18n/metadata";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentGame } from "@/lib/games";
import { createClient } from "@/lib/supabase/server";
import { FanartForm, WithdrawFanart } from "./forms";

export const generateMetadata = titled("fanart");

export default async function FanartPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/entrar?next=/coleccion/fanart");
  const [{ game, games }, { data: mine }] = await Promise.all([
    currentGame(),
    supabase
      .from("fanart_submissions")
      .select("id, game_id, title, status, review_note, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  const gameName = (id: string) => games.find((g) => g.id === id)?.name ?? id;
  const [t, to, locale] = await Promise.all([getTranslations("fanart"), getTranslations("options.fanartStatus"), getLocale()]);
  const when = new Intl.DateTimeFormat(INTL_LOCALE[locale], { timeZone: "Europe/Madrid", dateStyle: "medium" });

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link href="/coleccion" className="inline-flex min-h-11 items-center self-start text-sm text-muted hover:text-text">
          ← {t("back")}
        </Link>
        <h1 className="font-display text-3xl font-semibold">{t("title")}</h1>
        <p className="max-w-2xl text-muted">{t("lead")}</p>
      </header>

      <FanartForm userId={userId} games={games.map((g) => ({ id: g.id, name: g.name }))} current={game.id} />

      <section aria-labelledby="mis-envios" className="flex flex-col gap-3">
        <h2 id="mis-envios" className="font-semibold">
          {t("mine")}
        </h2>
        {!mine?.length ? (
          <p className="text-sm text-muted">{t("none")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {mine.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 surface p-4">
                <div>
                  <p className="font-semibold">{f.title}</p>
                  <p className="text-sm text-muted">
                    {gameName(f.game_id)} · {when.format(new Date(f.created_at))} · {to(f.status)}
                  </p>
                  {f.review_note && <p className="text-sm text-muted">{t("note", { note: f.review_note })}</p>}
                </div>
                {f.status !== "withdrawn" && <WithdrawFanart id={f.id} />}
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
