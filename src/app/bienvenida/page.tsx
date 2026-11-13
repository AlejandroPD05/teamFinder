import { getTranslations } from "next-intl/server";
import { titled } from "@/lib/i18n/metadata";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import { GAME_GLYPHS } from "@/components/game-glyphs";
import { currentGame } from "@/lib/games";
import { loadCatalog, loadOwnProfile } from "@/lib/profile/queries";
import { createClient } from "@/lib/supabase/server";
import { chooseWelcomeGame, skipWelcome } from "./actions";
import { RankStep, RolesStep } from "./forms";

export const generateMetadata = titled("welcome", { robots: { index: false } });

const STEPS = ["game", "role", "rank"] as const;

/** Guía de bienvenida para cuentas nuevas: juego → rol → rango, en tres pantallas cortas. Se puede saltar. */
export default async function WelcomePage({ searchParams }: PageProps<"/bienvenida">) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/entrar?next=/bienvenida");
  const raw = (await searchParams).paso;
  const step = Math.min(3, Math.max(1, Number(Array.isArray(raw) ? raw[0] : raw) || 1));
  const { game, games } = await currentGame();
  const [catalog, own, t] = await Promise.all([
    loadCatalog(supabase, game.id),
    loadOwnProfile(supabase, userId, game.id),
    getTranslations("welcome"),
  ]);

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="kicker">{t("kicker", { step })}</p>
        <h1 className="font-display text-3xl font-semibold">
          {step === 1 ? t("gameTitle") : step === 2 ? t("roleTitle", { game: game.name }) : t("rankTitle")}
        </h1>
        <p className="text-muted">{t("lead")}</p>
      </header>

      <ol aria-label={t("steps")} className="grid grid-cols-3 gap-2">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i + 1 === step ? "step" : undefined} className="flex flex-col gap-1.5 text-xs">
            <span className={`h-1.5 rounded-full ${i + 1 <= step ? "bg-accent" : "bg-line"}`} />
            <span className={i + 1 === step ? "font-semibold text-text" : "text-muted"}>{t(`step.${s}`)}</span>
          </li>
        ))}
      </ol>

      <div className="surface hud p-5">
        {step === 1 && (
          <form action={chooseWelcomeGame} className="grid grid-cols-3 gap-3">
            {games.map((g) => {
              const Glyph = GAME_GLYPHS[g.id];
              return (
                <button
                  key={g.id}
                  type="submit"
                  name="game"
                  value={g.id}
                  aria-pressed={g.id === game.id}
                  style={{ "--tile": g.theme_accent ?? "var(--color-accent)" } as CSSProperties}
                  className={`flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border-2 p-3 transition-colors ${
                    g.id === game.id ? "border-[var(--tile)] bg-panel-hover" : "border-line hover:border-[var(--tile)]"
                  }`}
                >
                  {Glyph && <Glyph aria-hidden="true" className="size-10 text-[var(--tile)]" />}
                  <span className="font-display text-sm font-bold sm:text-base">{g.short_name ?? g.name}</span>
                </button>
              );
            })}
          </form>
        )}
        {step === 2 && (
          <RolesStep
            roles={catalog.roles}
            selected={own.roles.map((r) => r.role_id)}
            primary={own.roles.find((r) => r.is_primary)?.role_id ?? null}
          />
        )}
        {step === 3 && (
          <RankStep
            name={own.profile.display_name}
            ranks={catalog.ranks}
            regions={catalog.regions}
            rankId={own.game?.rank_id ?? null}
            regionId={own.game?.region_id ?? null}
          />
        )}
      </div>

      <form action={skipWelcome}>
        <button type="submit" className="min-h-11 text-sm text-muted underline underline-offset-4 hover:text-text">
          {t("skip")}
        </button>
      </form>
    </section>
  );
}
