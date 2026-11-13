import { Crown, Medal, Trophy } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { titled } from "@/lib/i18n/metadata";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import { NumberRoll } from "@/components/number-roll";
import { currentGame } from "@/lib/games";
import { loadNames } from "@/lib/lobbies/queries";
import { RANKING_RULES as R, daysLeft, rankTier, weekLabel } from "@/lib/ranking";
import { createClient } from "@/lib/supabase/server";

export const generateMetadata = titled("ranking");

const TIER_ICON = { top1: Crown, podium: Medal, top10: Trophy } as const;

type Row = { pos: number; user_id: string; points: number; recognitions: number; finished: number };

export default async function RankingPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const me = claims?.claims?.sub;
  if (!me) redirect("/entrar?next=/ranking");
  const { game } = await currentGame();

  const [{ data: official }, { data: everyone }, { data: past }, { data: blocks }] = await Promise.all([
    supabase.rpc("weekly_ranking", { p_game: game.id }),
    // Tu progreso aunque aún no entres (mismas reglas, sin el mínimo de grupos).
    supabase.rpc("weekly_ranking", { p_game: game.id, p_min_finished: 1 }),
    supabase
      .from("weekly_rank_awards")
      .select("week_start, user_id, pos, points")
      .eq("game_id", game.id)
      .order("week_start", { ascending: false })
      .order("pos")
      .limit(80),
    supabase.from("user_blocks").select("blocked_id"),
  ]);
  const rows: Row[] = official ?? [];
  const top = rows.slice(0, R.topSize);
  const mine = rows.find((r) => r.user_id === me);
  const progress = (everyone ?? []).find((r: Row) => r.user_id === me);
  const blocked = new Set((blocks ?? []).map((b) => b.blocked_id));
  const weeks = [...new Set((past ?? []).map((a) => a.week_start))].slice(0, 8);
  const names = await loadNames(supabase, [...top.map((r) => r.user_id), ...(past ?? []).map((a) => a.user_id)]);
  const left = daysLeft();
  const [t, locale] = await Promise.all([getTranslations("ranking"), getLocale()]);
  const tier = (k: "top1" | "podium" | "top10") => t(`tier.${k}`);

  const who = (id: string) =>
    blocked.has(id)
      ? { name: t("blockedPlayer"), avatar: null, link: false }
      : { ...(names.get(id) ?? { name: t("player"), avatar: null }), link: true };

  return (
    <section className="flex max-w-3xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="kicker">{game.name}</p>
        <h1 className="font-display text-3xl font-semibold">{t("title")}</h1>
        <p className="text-muted">{t("lead")}</p>
      </header>

      <section aria-labelledby="esta-semana" className="surface hud flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="esta-semana" className="font-display text-xl font-semibold">
            {t("thisWeek")}
          </h2>
          <span className="text-sm text-muted">
            {t("provisional")} · {left === 1 ? t("closesToday") : t("closesIn", { days: left })}
          </span>
        </div>

        <p className="rounded-md bg-bg px-3 py-2 text-sm">
          {mine ? (
            t.rich("mine", {
              pos: mine.pos,
              b: (c) => <strong>{c}</strong>,
              points: () => <NumberRoll value={mine.points} className="font-semibold" />,
            })
          ) : progress ? (
            t("progress", { finished: progress.finished, min: R.minFinished })
          ) : (
            <>
              {t("notYet", { min: R.minFinished })}{" "}
              <Link href="/grupos" className="underline underline-offset-4">
                {t("seeLobbies")}
              </Link>
            </>
          )}
        </p>

        {top.length === 0 ? (
          <p className="text-sm text-muted">{t("empty", { min: R.minFinished })}</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {top.map((r, i) => {
              const rt = rankTier(r.pos);
              const Icon = TIER_ICON[rt];
              const p = who(r.user_id);
              return (
                <li
                  key={r.user_id}
                  className={`enter flex items-center gap-3 rounded-lg px-3 py-2 ${r.user_id === me ? "bg-panel-hover ring-1 ring-accent" : "bg-bg"}`}
                  style={{ "--i": i } as CSSProperties}
                >
                  <span className={`w-8 text-center font-display text-lg font-bold tabular-nums ${rt === "top10" ? "text-muted" : "text-accent-soft"}`}>
                    {r.pos}
                  </span>
                  {p.avatar ? (
                    <Image src={p.avatar} alt="" width={32} height={32} className="size-8 rounded-full" />
                  ) : (
                    <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-full bg-panel-hover text-xs font-semibold">
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    {p.link ? (
                      <Link href={`/jugador/${r.user_id}`} className="block truncate font-semibold hover:underline">
                        {p.name}
                      </Link>
                    ) : (
                      <span className="block truncate text-muted">{p.name}</span>
                    )}
                    <span className="block text-xs text-muted">
                      {t("recognitions", { count: r.recognitions })} · {t("finished", { count: r.finished })}
                    </span>
                  </span>
                  {rt !== "top10" && <Icon aria-label={tier(rt)} className="size-5 text-accent-soft" />}
                  <span className="text-right font-display font-semibold">
                    <NumberRoll value={r.points} /> <span className="text-xs font-normal text-muted">{t("pts")}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <details className="surface p-5 text-sm">
        <summary className="min-h-11 cursor-pointer py-2 font-medium">{t("how")}</summary>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-muted">
          <li>{t("rules.week")}</li>
          <li>{t("rules.points", { perRecognition: R.pointsPerRecognition, perFinished: R.pointsPerFinished })}</li>
          <li>{t("rules.finished")}</li>
          <li>{t("rules.once")}</li>
          <li>{t("rules.minimum", { min: R.minFinished })}</li>
          <li>{t("rules.ties")}</li>
          <li>{t("rules.badges", { top1: tier("top1"), podium: tier("podium"), top10: tier("top10") })}</li>
        </ul>
      </details>

      <section aria-labelledby="anteriores" className="flex flex-col gap-4">
        <h2 id="anteriores" className="font-display text-xl font-semibold">
          {t("past")}
        </h2>
        {weeks.length === 0 ? (
          <p className="text-sm text-muted">{t("noPast")}</p>
        ) : (
          weeks.map((w) => (
            <section key={w} aria-labelledby={`sem-${w}`} className="surface p-4">
              <h3 id={`sem-${w}`} className="font-semibold">
                {t("week", { range: weekLabel(w, locale) })}
              </h3>
              <ol className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                {(past ?? [])
                  .filter((a) => a.week_start === w)
                  .map((a) => {
                    const p = who(a.user_id);
                    return (
                      <li key={a.user_id} className="flex gap-2">
                        <span className="w-6 text-right tabular-nums text-muted">{a.pos}.</span>
                        {p.link ? (
                          <Link href={`/jugador/${a.user_id}`} className="truncate hover:underline">
                            {p.name}
                          </Link>
                        ) : (
                          <span className="truncate text-muted">{p.name}</span>
                        )}
                        <span className="ml-auto tabular-nums text-muted">{a.points} {t("pts")}</span>
                      </li>
                    );
                  })}
              </ol>
            </section>
          ))
        )}
      </section>
    </section>
  );
}
