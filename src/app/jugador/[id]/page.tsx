import { currentGame } from "@/lib/games";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { AVAILABILITY, CHARACTER_STATUS, GOALS, LANGUAGES, VOICE, type CharacterStatus } from "@/lib/profile/options";
import { loadCatalog, loadPublicProfile } from "@/lib/profile/queries";
import { KARMA_TAGS } from "@/lib/trust/options";
import { CharacterIcon } from "@/components/game-icons";
import { createClient } from "@/lib/supabase/server";
import { BlockButton, ReportForm } from "../../confianza/forms";

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
    currentGame().then(({ game }) => loadCatalog(supabase, game.id).then((c) => ({ ...c, game }))),
    currentGame().then(({ game }) => loadPublicProfile(supabase, id, game.id)),
  ]);
  if (!data.profile) notFound();

  const { profile, game, roles, characters } = data;
  const viewer = claims?.claims?.sub;
  const isOwner = viewer === id;
  const [{ data: karma }, { data: myBlock }] = await Promise.all([
    viewer ? supabase.rpc("karma_summary", { p_user: id }) : Promise.resolve({ data: null }),
    viewer && !isOwner ? supabase.from("user_blocks").select("blocked_id").eq("blocked_id", id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const k = karma?.[0];
  const name = profile.display_name ?? "Jugador";
  const rankRow = catalog.ranks.find((r) => r.id === game?.rank_id);
  const rank = rankRow?.name;
  const region = catalog.regions.find((r) => r.id === game?.region_id)?.name;
  const roleName = new Map(catalog.roles.map((r) => [r.id, r.name]));
  const charById = new Map(catalog.characters.map((c) => [c.id, c]));
  const byStatus = (Object.keys(CHARACTER_STATUS) as CharacterStatus[])
    .map((s) => ({ s, chars: characters.filter((c) => c.status === s).map((c) => charById.get(c.character_id!)).filter(Boolean) }))
    .filter((g) => g.chars.length > 0);

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
          <h1 className="font-display text-3xl font-semibold">{name}</h1>
          {game?.flex && (
            <span className="mt-1 inline-block text-sm font-medium text-info-soft">Flex</span>
          )}
        </div>
        {isOwner && (
          <Link href="/perfil/editar" className="btn-ghost">
            Editar perfil
          </Link>
        )}
      </header>

      <section aria-labelledby="sobre" className="surface p-5">
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

      <section aria-labelledby="karma" className="surface p-5">
        <h2 id="karma" className="font-semibold">
          Karma
        </h2>
        {!viewer ? (
          <p className="mt-2 text-sm text-muted">Entra para ver el karma.</p>
        ) : k && Number(k.positives) > 0 ? (
          <>
            <p className="mt-2 text-sm">
              {k.positives} {Number(k.positives) === 1 ? "reconocimiento" : "reconocimientos"} de compañeros
            </p>
            {k.top_tags.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2">
                {k.top_tags.map((t) => (
                  <li key={t} className="rounded border border-line px-2 py-0.5 text-xs text-muted">
                    {KARMA_TAGS[t as keyof typeof KARMA_TAGS] ?? t}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">Sin valoraciones todavía.</p>
        )}
        <p className="mt-3 text-xs text-muted">
          Reputación social: tras cerrar un grupo, cada miembro puede reconocer una vez a cada compañero durante 7 días. Solo hay
          reconocimientos positivos: se muestran el total y los motivos más repetidos, nunca quién los dio. No es un ranking oficial.
        </p>
      </section>

      <section aria-labelledby="valorant" className="surface p-5">
        <h2 id="valorant" className="font-semibold">
          {catalog.game.name}
        </h2>
        {game ? (
          <dl className="mt-4 flex flex-col gap-3">
            <Row
              title="Rango"
              value={
                rank ? (
                  <span className="inline-flex items-center gap-2">
                    {rankRow?.icon_url && <Image src={rankRow.icon_url} alt="" width={28} height={28} />}
                    <span>
                      <span>{rank}</span>{" "}
                      <span className="text-muted">· introducido manualmente</span>
                    </span>
                  </span>
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
              title={catalog.game.character_label ?? "Personajes"}
              value={
                byStatus.length ? (
                  <ul className="flex flex-col gap-3">
                    {byStatus.map((g) => (
                      <li key={g.s} className="flex flex-col gap-1.5">
                        <span className="text-sm text-muted">{CHARACTER_STATUS[g.s]}</span>
                        <ul className="flex flex-wrap gap-3">
                          {g.chars.map((c) => (
                            <li key={c!.id} className="flex items-center gap-2">
                              <CharacterIcon name={c!.name} src={c!.icon_url} size={36} ring={g.s === "main" ? "main" : g.s === "comfort" ? "comfort" : null} />
                              <span>{c!.name}</span>
                            </li>
                          ))}
                        </ul>
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
            {isOwner ? `Aún no has rellenado tu perfil de ${catalog.game.name}.` : `Sin datos de ${catalog.game.name} visibles.`}
          </p>
        )}
        {catalog.game.id === "valorant" && (
          <p className="mt-4 inline-block rounded border border-line px-2 py-1 text-xs text-muted">
            Cuenta Riot: no conectada (integración pendiente)
          </p>
        )}
      </section>

      {viewer && !isOwner && (
        <section aria-labelledby="seguridad" className="flex flex-col gap-2 surface p-5">
          <h2 id="seguridad" className="font-semibold">
            Seguridad
          </h2>
          {myBlock && <p className="text-sm text-muted">Has bloqueado a este jugador: no os veréis en búsquedas ni grupos.</p>}
          <BlockButton userId={id} blocked={Boolean(myBlock)} name={name} />
          <ReportForm targetId={id} label="Denunciar a este jugador" />
        </section>
      )}
    </article>
  );
}
