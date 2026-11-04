import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { AVAILABILITY, CHARACTER_STATUS, GOALS, LANGUAGES, VOICE, type CharacterStatus } from "@/lib/profile/options";
import { loadCatalog, loadPublicProfile } from "@/lib/profile/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Perfil de jugador" };

const label = <T extends Record<string, string>>(o: T, k: string) => (o as Record<string, string>)[k] ?? k;

function Row({ title, value }: { title: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[10rem_1fr]">
      <dt className="text-sm text-muted">{title}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

/** null = oculto por privacidad; [] = sin rellenar. */
function list(values: string[] | null, dict: Record<string, string>) {
  if (values == null) return <span className="text-muted">Oculto</span>;
  if (values.length === 0) return <span className="text-muted">Sin indicar</span>;
  return values.map((v) => label(dict, v)).join(" · ");
}

export default async function PlayerPage({ params }: PageProps<"/jugador/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const [{ data: claims }, catalog, data] = await Promise.all([
    supabase.auth.getClaims(),
    loadCatalog(supabase),
    loadPublicProfile(supabase, id),
  ]);
  if (!data.profile) notFound();

  const { profile, game, roles, characters } = data;
  const isOwner = claims?.claims?.sub === id;
  const name = profile.display_name ?? "Jugador";
  const rank = catalog.ranks.find((r) => r.id === game?.rank_id)?.name;
  const region = catalog.regions.find((r) => r.id === game?.region_id)?.name;
  const roleName = new Map(catalog.roles.map((r) => [r.id, r.name]));
  const charName = new Map(catalog.characters.map((c) => [c.id, c.name]));
  const byStatus = (Object.keys(CHARACTER_STATUS) as CharacterStatus[])
    .map((s) => ({ s, names: characters.filter((c) => c.status === s).map((c) => charName.get(c.character_id!)) }))
    .filter((g) => g.names.length > 0);

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center gap-4">
        {profile.avatar_url ? (
          <Image src={profile.avatar_url} alt="" width={64} height={64} className="rounded-full" />
        ) : (
          <span aria-hidden="true" className="flex size-16 items-center justify-center rounded-full bg-panel text-2xl font-semibold">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
          {game?.flex && (
            <span className="mt-1 inline-block rounded border border-info/50 px-2 py-0.5 text-xs text-info-soft">Flex</span>
          )}
        </div>
        {isOwner && (
          <Link href="/perfil/editar" className="inline-flex min-h-11 items-center rounded-md border border-line px-4 text-sm hover:bg-panel-hover">
            Editar perfil
          </Link>
        )}
      </header>

      <section aria-labelledby="sobre" className="rounded-lg border border-line bg-panel p-5">
        <h2 id="sobre" className="font-semibold">
          Sobre {isOwner ? "ti" : "este jugador"}
        </h2>
        <dl className="mt-4 flex flex-col gap-3">
          <Row title="Idiomas" value={list(profile.languages, LANGUAGES)} />
          <Row title="Horarios" value={list(profile.availability, AVAILABILITY)} />
          <Row title="Objetivos" value={list(profile.goals, GOALS)} />
          <Row
            title="Comunicación"
            value={profile.voice ? label(VOICE, profile.voice) : <span className="text-muted">Sin indicar u oculto</span>}
          />
        </dl>
      </section>

      <section aria-labelledby="valorant" className="rounded-lg border border-line bg-panel p-5">
        <h2 id="valorant" className="font-semibold">
          VALORANT
        </h2>
        {game ? (
          <dl className="mt-4 flex flex-col gap-3">
            <Row
              title="Rango"
              value={
                rank ? (
                  <>
                    {rank} <span className="text-muted">· introducido manualmente</span>
                  </>
                ) : (
                  <span className="text-muted">Sin indicar</span>
                )
              }
            />
            <Row title="Servidor" value={region ?? <span className="text-muted">Sin indicar</span>} />
            <Row
              title="Modos"
              value={
                game.mode_slugs?.length ? (
                  game.mode_slugs.map((s) => catalog.modes.find((m) => m.slug === s)?.name ?? s).join(" · ")
                ) : (
                  <span className="text-muted">Sin indicar</span>
                )
              }
            />
            <Row
              title="Roles"
              value={
                roles.length ? (
                  roles
                    .toSorted((a, b) => Number(b.is_primary) - Number(a.is_primary))
                    .map((r) => `${roleName.get(r.role_id!)}${r.is_primary ? " (principal)" : ""}`)
                    .join(" · ")
                ) : (
                  <span className="text-muted">Sin indicar</span>
                )
              }
            />
            <Row
              title="Agentes"
              value={
                byStatus.length ? (
                  <ul className="flex flex-col gap-1">
                    {byStatus.map((g) => (
                      <li key={g.s}>
                        <span className="text-muted">{CHARACTER_STATUS[g.s]}:</span> {g.names.join(", ")}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-muted">Sin indicar</span>
                )
              }
            />
          </dl>
        ) : (
          <p className="mt-3 text-sm text-muted">
            {isOwner ? "Aún no has rellenado tu perfil de VALORANT." : "Sin datos de VALORANT visibles."}
          </p>
        )}
        <p className="mt-4 inline-block rounded border border-line px-2 py-1 text-xs text-muted">
          Cuenta Riot: no conectada (integración pendiente)
        </p>
      </section>
    </article>
  );
}
