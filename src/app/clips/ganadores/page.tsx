import { Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { INTL_LOCALE, type AppLocale } from "@/lib/i18n/locale";
import { titled } from "@/lib/i18n/metadata";
import Link from "next/link";
import { redirect } from "next/navigation";
import { loadEmblems, loadWinners, type Winner } from "@/lib/clips/queries";
import { currentGame } from "@/lib/games";
import { createClient } from "@/lib/supabase/server";

export const generateMetadata = titled("clipWinners");

/** Fechas de inicio y fin de la semana («3 de noviembre», «9 de noviembre»). */
function weekDates(start: string, locale: AppLocale) {
  const weekFmt = new Intl.DateTimeFormat(INTL_LOCALE[locale], { day: "numeric", month: "long" });
  const a = new Date(`${start}T12:00:00`);
  const b = new Date(a.getTime() + 6 * 86_400_000);
  return { start: weekFmt.format(a), end: weekFmt.format(b) };
}

export default async function WinnersPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/entrar?next=/clips/ganadores");
  const { game } = await currentGame();
  const [winners, emblems] = await Promise.all([loadWinners(supabase, game.id, 12), loadEmblems(supabase)]);
  const weeks = [...new Set(winners.map((w) => w.week_start))];
  const [t, locale] = await Promise.all([getTranslations("clipWinners"), getLocale()]);

  return (
    <section className="flex max-w-3xl flex-col gap-8">
      <Link href="/clips" className="inline-flex min-h-11 items-center text-sm text-muted underline underline-offset-4 hover:text-text">
        {t("back")}
      </Link>
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-semibold">{t("title", { game: game.name })}</h1>
        <p className="text-muted">{t("lead")}</p>
      </header>

      <details className="surface p-5 text-sm">
        <summary className="min-h-11 cursor-pointer py-2 font-medium">{t("how")}</summary>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-muted">
          {(["week", "winner", "votes", "minimum", "hidden", "discord"] as const).map((k) => (
            <li key={k}>{t(`rules.${k}`)}</li>
          ))}
        </ul>
      </details>

      {weeks.length === 0 ? (
        <p className="surface p-5 text-muted">{t("empty")}</p>
      ) : (
        weeks.map((week) => {
          const list = winners.filter((w) => w.week_start === week);
          return (
            <section key={week} aria-labelledby={`w-${week}`} className="flex flex-col gap-3">
              <h2 id={`w-${week}`} className="font-display text-xl font-semibold">
                {t("week", weekDates(week, locale))}
                {!list[0].closed && <span className="ml-2 text-sm font-normal text-muted">{t("ongoing")}</span>}
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {list.map((w) => (
                  <WinnerItem key={w.emblem_id} w={w} emblem={emblems.find((e) => e.id === w.emblem_id)?.name ?? ""} />
                ))}
              </ul>
            </section>
          );
        })
      )}
    </section>
  );
}

function WinnerItem({ w, emblem }: { w: Winner; emblem: string }) {
  const t = useTranslations("clipWinners");
  return (
    <li className="surface flex items-start gap-3 p-4">
      <Trophy aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-warning" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm font-medium">
          {emblem} · {t("votes", { count: w.votes })}
        </span>
        {w.clip ? (
          <>
            <Link href={`/clips/${w.clip.id}`} className="truncate font-display font-semibold hover:underline hover:underline-offset-4">
              {w.clip.title}
            </Link>
            <span className="text-sm text-muted">{t("by", { author: w.clip.author })}</span>
          </>
        ) : (
          <span className="text-sm text-muted">{t("unavailable")}</span>
        )}
      </div>
    </li>
  );
}
