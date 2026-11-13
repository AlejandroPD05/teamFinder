import { getTranslations } from "next-intl/server";
import { titled } from "@/lib/i18n/metadata";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentGame } from "@/lib/games";
import { loadMissions } from "@/lib/missions/queries";
import { createClient } from "@/lib/supabase/server";
import { ClaimReward } from "./claim";

export const generateMetadata = titled("missions");

export default async function MissionsPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/entrar?next=/misiones");
  const { game } = await currentGame();
  const [missions, t] = await Promise.all([loadMissions(supabase, game.id), getTranslations("missions")]);

  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-semibold">{t("title", { game: game.name })}</h1>
        <p className="max-w-2xl text-muted">{t("lead")}</p>
      </header>

      {missions.length === 0 ? (
        <p className="surface p-5 text-muted">{t("empty", { game: game.name })}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {missions.map((m) => (
            <li key={m.id} className="surface flex flex-col gap-4 p-5">
              <div className="flex flex-col gap-1">
                <h2 className="font-display text-xl font-semibold">{m.title}</h2>
                <p className="text-sm text-muted">{m.description}</p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                  <span id={`p-${m.id}`}>{t("progress")}</span>
                  <span className="tabular-nums">
                    {t("progressCount", { progress: m.progress, target: m.target })}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-labelledby={`p-${m.id}`}
                  aria-valuenow={m.progress}
                  aria-valuemin={0}
                  aria-valuemax={m.target}
                  className="h-2 overflow-hidden rounded-full bg-bg"
                >
                  <div
                    className="h-full bg-accent transition-[width] duration-500 ease-out"
                    style={{ width: `${(m.progress / m.target) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted">
                  {t("rules")}
                  {m.claims > 0 && ` ${t("claims", { count: m.claims })}`}
                </p>
              </div>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <ClaimReward missionId={m.id} claimable={m.claimable} />
                <Link href="/coleccion" className="text-sm text-muted underline underline-offset-4 hover:text-text">
                  {t("collection", { owned: m.cards_owned, total: m.cards_total })}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
