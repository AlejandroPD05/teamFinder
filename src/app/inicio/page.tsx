import { currentGame } from "@/lib/games";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { titled } from "@/lib/i18n/metadata";
import { loadOwnProfile } from "@/lib/profile/queries";
import { profileCompletion } from "@/lib/profile/schema";
import { ProfileSteps } from "@/components/profile-steps";
import { loadCatalog } from "@/lib/profile/queries";
import { AvailableNow } from "./available-now";
import { Suggestions } from "./suggestions";
import { activeRestriction, formatUntil } from "@/lib/restrictions";
import { createClient } from "@/lib/supabase/server";

export const generateMetadata = titled("dashboard");

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/entrar?next=/inicio");

  const { game: current } = await currentGame();
  const [{ profile, game, roles, characters }, { data: isAdmin }, restriction, catalog] = await Promise.all([
    loadOwnProfile(supabase, userId, current.id),
    supabase.rpc("is_admin"),
    activeRestriction(supabase, userId),
    loadCatalog(supabase, current.id),
  ]);
  // Cuenta nueva: primero la guía de bienvenida (juego → rol → rango).
  if (!profile.onboarded_at) redirect("/bienvenida");
  const { modes } = catalog;
  const name = profile.display_name;
  const [t, locale] = await Promise.all([getTranslations("dashboard"), getLocale()]);
  const link = (chunks: React.ReactNode) => (
    <Link href="/normas" className="underline underline-offset-4">
      {chunks}
    </Link>
  );
  const completion = profileCompletion({
    languages: profile.languages,
    availability: profile.availability,
    goals: profile.goals,
    voice: profile.voice,
    rank_id: game?.rank_id ?? null,
    region_id: game?.region_id ?? null,
    roles: roles.length,
    characters: current.character_label ? characters.length : null,
    characterLabel: current.character_label ?? undefined,
  });

  return (
    <section className="flex flex-col gap-8">
      {restriction && (
        <div role="alert" className="rounded-lg border border-danger bg-panel p-4 text-sm">
          <p className="font-semibold">{t("restrictedUntil", { until: formatUntil(restriction.until, locale) })}</p>
          <p className="mt-1 text-muted">{t.rich("restrictedText", { reason: restriction.reason, rules: link })}</p>
        </div>
      )}
      <div className="flex items-center gap-4">
        {profile.avatar_url ? (
          <Image src={profile.avatar_url} alt="" width={56} height={56} className="rounded-full" />
        ) : (
          <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-full bg-panel text-xl font-semibold">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
        <div>
          <p className="kicker">{current.name}</p>
          <h1 className="font-display text-3xl font-semibold">{t("title", { name })}</h1>
          <p className="text-muted">{t("lead")}</p>
        </div>
      </div>

      {game ? (
        <AvailableNow
          until={game.available_until}
          mode={game.available_mode}
          modes={modes}
          gameName={current.name}
        />
      ) : null}

      {game ? (
        <Suggestions supabase={supabase} userId={userId} gameId={current.id} catalog={catalog} characterLabel={current.character_label} />
      ) : null}

      <div className="surface hud p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">{t("profileTitle")}</h2>
          <span className="text-sm text-muted">{t("percent", { percent: completion.percent })}</span>
        </div>
        <div
          role="progressbar"
          aria-label={t("progressLabel")}
          aria-valuenow={completion.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="mt-3 h-2 overflow-hidden rounded-full bg-bg"
        >
          <div className="h-full rounded-full bg-accent shadow-[0_0_12px_var(--color-accent)]" style={{ width: `${completion.percent}%` }} />
        </div>
        {completion.missing.length > 0 && (
          <ProfileSteps missing={completion.missing} characterLabel={current.character_label} />
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/perfil/editar"
            className="btn-primary"
          >
            {completion.percent === 100 ? t("editProfile") : t("completeProfile")}
          </Link>
          <Link
            href={`/jugador/${userId}`}
            className="btn-ghost"
          >
            {t("publicProfile")}
          </Link>
        </div>
        {current.id === "valorant" && (
          <p className="mt-4 inline-block rounded border border-line px-2 py-1 text-xs text-muted">{t("riot")}</p>
        )}
      </div>

      <nav aria-label={t("moreLabel")} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/mis-equipos" className="surface surface-interactive flex min-h-11 flex-col gap-1 p-5">
          <span className="font-display text-lg font-semibold">{t("teams")}</span>
          <span className="text-sm text-muted">{t("teamsText")}</span>
        </Link>
        <Link href="/ranking" className="surface surface-interactive flex min-h-11 flex-col gap-1 p-5">
          <span className="font-display text-lg font-semibold">{t("ranking")}</span>
          <span className="text-sm text-muted">{t("rankingText", { game: current.name })}</span>
        </Link>
        <Link href="/misiones" className="surface surface-interactive flex min-h-11 flex-col gap-1 p-5">
          <span className="font-display text-lg font-semibold">{t("missions")}</span>
          <span className="text-sm text-muted">{t("missionsText", { game: current.name })}</span>
        </Link>
        <Link href="/coleccion" className="surface surface-interactive flex min-h-11 flex-col gap-1 p-5">
          <span className="font-display text-lg font-semibold">{t("collection")}</span>
          <span className="text-sm text-muted">{t("collectionText")}</span>
        </Link>
      </nav>

      <nav aria-label={t("accountLabel")} className="flex flex-wrap gap-3 text-sm">
        <Link href="/ajustes" className="inline-flex min-h-11 items-center rounded-md border border-line px-4 hover:bg-panel-hover">
          {t("settings")}
        </Link>
        <Link href="/amigos" className="inline-flex min-h-11 items-center rounded-md border border-line px-4 hover:bg-panel-hover">
          {t("friends")}
        </Link>
        <Link href="/sugerencias?desde=/inicio" className="inline-flex min-h-11 items-center rounded-md border border-line px-4 hover:bg-panel-hover">
          {t("feedback")}
        </Link>
        {isAdmin && (
          <Link href="/moderacion" className="inline-flex min-h-11 items-center rounded-md border border-line px-4 hover:bg-panel-hover">
            {t("moderation")}
          </Link>
        )}
      </nav>
    </section>
  );
}
