import { currentGame } from "@/lib/games";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { es } from "@/lib/i18n/es";
import { loadOwnProfile } from "@/lib/profile/queries";
import { profileCompletion } from "@/lib/profile/schema";
import { ProfileSteps } from "@/components/profile-steps";
import { loadCatalog } from "@/lib/profile/queries";
import { AvailableNow } from "./available-now";
import { activeRestriction, untilFormat } from "@/lib/restrictions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Inicio" };

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/entrar?next=/inicio");

  const { game: current } = await currentGame();
  const [{ profile, game, roles, characters }, { data: isAdmin }, restriction, { modes }] = await Promise.all([
    loadOwnProfile(supabase, userId, current.id),
    supabase.rpc("is_admin"),
    activeRestriction(supabase, userId),
    loadCatalog(supabase, current.id),
  ]);
  // Cuenta nueva: primero la guía de bienvenida (juego → rol → rango).
  if (!profile.onboarded_at) redirect("/bienvenida");
  const name = profile.display_name;
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
          <p className="font-semibold">Tu cuenta está restringida hasta el {untilFormat.format(new Date(restriction.until))}.</p>
          <p className="mt-1 text-muted">
            Motivo: {restriction.reason}. Mientras dure no puedes crear grupos, pedir unirte, escribir mensajes, publicar clips,
            comentar ni dar emblemas. Puedes seguir viendo la web. Si crees que es un error, escríbenos (ver{" "}
            <Link href="/normas" className="underline underline-offset-4">
              Normas
            </Link>
            ).
          </p>
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
          <h1 className="font-display text-3xl font-semibold">{es.dashboard.title(name)}</h1>
          <p className="text-muted">{es.dashboard.lead}</p>
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

      <div className="surface hud p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">{es.dashboard.profileTitle}</h2>
          <span className="text-sm text-muted">{completion.percent}% completado</span>
        </div>
        <div
          role="progressbar"
          aria-label="Perfil completado"
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
            {completion.percent === 100 ? "Editar perfil" : "Completar perfil"}
          </Link>
          <Link
            href={`/jugador/${userId}`}
            className="btn-ghost"
          >
            Ver mi perfil público
          </Link>
        </div>
        {current.id === "valorant" && (
          <p className="mt-4 inline-block rounded border border-line px-2 py-1 text-xs text-muted">{es.dashboard.riot}</p>
        )}
      </div>

      <nav aria-label="Equipos, ranking, misiones y colección" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/mis-equipos" className="surface surface-interactive flex min-h-11 flex-col gap-1 p-5">
          <span className="font-display text-lg font-semibold">Mis equipos</span>
          <span className="text-sm text-muted">Tu grupo de siempre, con su propio chat.</span>
        </Link>
        <Link href="/ranking" className="surface surface-interactive flex min-h-11 flex-col gap-1 p-5">
          <span className="font-display text-lg font-semibold">Ranking semanal</span>
          <span className="text-sm text-muted">Los mejores compañeros de {current.name} esta semana.</span>
        </Link>
        <Link href="/misiones" className="surface surface-interactive flex min-h-11 flex-col gap-1 p-5">
          <span className="font-display text-lg font-semibold">Misiones</span>
          <span className="text-sm text-muted">Llena grupos y gana cartas de {current.name}.</span>
        </Link>
        <Link href="/coleccion" className="surface surface-interactive flex min-h-11 flex-col gap-1 p-5">
          <span className="font-display text-lg font-semibold">Mi colección</span>
          <span className="text-sm text-muted">Las cartas que has conseguido.</span>
        </Link>
      </nav>

      <nav aria-label="Cuenta" className="flex flex-wrap gap-3 text-sm">
        <Link href="/ajustes" className="inline-flex min-h-11 items-center rounded-md border border-line px-4 hover:bg-panel-hover">
          Ajustes, bloqueados y borrar cuenta
        </Link>
        {isAdmin && (
          <Link href="/moderacion" className="inline-flex min-h-11 items-center rounded-md border border-line px-4 hover:bg-panel-hover">
            Moderación
          </Link>
        )}
      </nav>
    </section>
  );
}
