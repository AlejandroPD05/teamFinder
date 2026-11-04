import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { es } from "@/lib/i18n/es";
import { loadOwnProfile } from "@/lib/profile/queries";
import { profileCompletion } from "@/lib/profile/schema";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Inicio" };

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/entrar?next=/inicio");

  const [{ profile, game, roles, characters }, { data: isAdmin }] = await Promise.all([
    loadOwnProfile(supabase, userId),
    supabase.rpc("is_admin"),
  ]);
  const name = profile.display_name;
  const completion = profileCompletion({
    languages: profile.languages,
    availability: profile.availability,
    goals: profile.goals,
    voice: profile.voice,
    rank_id: game?.rank_id ?? null,
    region_id: game?.region_id ?? null,
    roles: roles.length,
    characters: characters.length,
  });

  return (
    <section className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        {profile.avatar_url ? (
          <Image src={profile.avatar_url} alt="" width={56} height={56} className="rounded-full" />
        ) : (
          <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-full bg-panel text-xl font-semibold">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{es.dashboard.title(name)}</h1>
          <p className="text-muted">{es.dashboard.lead}</p>
        </div>
      </div>

      <div className="rounded-lg border border-line bg-panel p-5">
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
          <div className="h-full bg-accent" style={{ width: `${completion.percent}%` }} />
        </div>
        {completion.missing.length > 0 && (
          <p className="mt-3 text-sm text-muted">Falta: {completion.missing.join(", ")}.</p>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/perfil/editar"
            className="inline-flex min-h-11 items-center rounded-md bg-accent px-5 font-semibold text-bg hover:bg-accent-soft"
          >
            {completion.percent === 100 ? "Editar perfil" : "Completar perfil"}
          </Link>
          <Link
            href={`/jugador/${userId}`}
            className="inline-flex min-h-11 items-center rounded-md border border-line px-5 text-sm hover:bg-panel-hover"
          >
            Ver mi perfil público
          </Link>
        </div>
        <p className="mt-4 inline-block rounded border border-line px-2 py-1 text-xs text-muted">{es.dashboard.riot}</p>
      </div>

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
