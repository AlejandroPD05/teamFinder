import { getLocale, getTranslations } from "next-intl/server";
import { INTL_LOCALE } from "@/lib/i18n/locale";
import { titled } from "@/lib/i18n/metadata";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentGame } from "@/lib/games";
import { matchSummary, todayInMadrid } from "@/lib/matches";
import { loadCatalog } from "@/lib/profile/queries";
import { createClient } from "@/lib/supabase/server";
import { AddMatchForm, DeleteMatch, MatchesVisibility } from "./forms";

export const generateMetadata = titled("matches");

export default async function MatchesPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/entrar?next=/perfil/partidas");
  const { game } = await currentGame();

  const [catalog, { data: modes }, { data: maps }, { data: matches }, { data: profile }] = await Promise.all([
    loadCatalog(supabase, game.id),
    supabase.from("game_modes").select("id, name").eq("game_id", game.id).eq("active", true).order("sort"),
    supabase.from("game_maps").select("name").eq("game_id", game.id).order("sort"),
    supabase
      .from("manual_matches")
      .select("id, played_on, mode_id, map_name, character_id, result, placement, kills, deaths, assists, note")
      .eq("user_id", userId)
      .eq("game_id", game.id)
      .order("played_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("profiles").select("matches_visibility").eq("id", userId).single(),
  ]);
  const list = matches ?? [];
  const modeName = new Map((modes ?? []).map((m) => [m.id, m.name]));
  const charName = new Map(catalog.characters.map((c) => [c.id, c.name]));
  const s = matchSummary(list);
  const [t, tp, to, locale] = await Promise.all([getTranslations("matches"), getTranslations("player"), getTranslations("options"), getLocale()]);
  const dateFmt = new Intl.DateTimeFormat(INTL_LOCALE[locale], { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

  return (
    <section className="flex max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link href="/perfil" className="inline-flex min-h-11 items-center self-start text-sm text-muted hover:text-text">
          ← {t("back")}
        </Link>
        <p className="kicker">{game.name}</p>
        <h1 className="font-display text-3xl font-semibold">{t("title")}</h1>
        <p className="max-w-2xl text-muted">{t.rich("lead", { game: game.name, b: (c) => <strong>{c}</strong> })}</p>
        <MatchesVisibility value={profile?.matches_visibility ?? "private"} />
      </header>

      <AddMatchForm
        today={todayInMadrid()}
        modes={modes ?? []}
        characters={catalog.characters.map((c) => ({ id: c.id, name: c.name }))}
        characterLabel={game.character_label}
        maps={(maps ?? []).map((m) => m.name)}
      />

      <section aria-labelledby="registro" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="registro" className="font-display text-xl font-semibold">
            {t("log")}
          </h2>
          {s.total > 0 && (
            <p className="text-sm text-muted">
              {tp("matchCount", { count: s.total })}
              {s.winRate != null && ` · ${tp("winRate", { rate: s.winRate })}`}
              {s.kd != null && ` · K/D ${s.kd.toLocaleString(INTL_LOCALE[locale])}`} · {tp("manual")}
            </p>
          )}
        </div>
        {list.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-muted">{t("empty")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {list.map((m) => {
              const label = [
                dateFmt.format(new Date(`${m.played_on}T00:00:00Z`)),
                m.mode_id ? modeName.get(m.mode_id) : null,
                m.map_name,
                m.character_id ? charName.get(m.character_id) : null,
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <li key={m.id} className="flex flex-wrap items-center gap-3 surface p-3">
                  <span
                    className={`w-20 text-sm font-semibold ${m.result === "win" ? "text-success" : m.result === "loss" ? "text-danger" : "text-muted"}`}
                  >
                    {m.result ? to(`matchResults.${m.result}`) : m.placement ? `#${m.placement}` : "—"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{label}</span>
                    <span className="block text-xs text-muted">
                      {[
                        m.kills != null || m.deaths != null || m.assists != null
                          ? `${m.kills ?? "–"}/${m.deaths ?? "–"}/${m.assists ?? "–"}`
                          : null,
                        m.result && m.placement ? tp("placement", { n: m.placement }) : null,
                        m.note,
                      ]
                        .filter(Boolean)
                        .join(" · ") || t("noMore")}
                    </span>
                  </span>
                  <DeleteMatch id={m.id} label={t("matchOf", { label })} />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </section>
  );
}
