import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { loadGames } from "@/lib/games";
import { loadNames } from "@/lib/lobbies/queries";
import { createClient } from "@/lib/supabase/server";
import { TEAM_MAX_MEMBERS } from "@/lib/teams";
import { CancelInvite, DeleteTeam, EditTeamForm, LeaveTeam } from "../../mis-equipos/forms";
import { TeamChat } from "./team-chat";
import { TeamEvents, type TeamEvent } from "./team-events";

export const metadata: Metadata = { title: "Equipo", robots: { index: false } };

/** Instante de hace `h` horas, en ISO (fuera del componente: la página se pinta en cada petición). */
function hoursAgo(h: number) {
  return new Date(Date.now() - h * 3_600_000).toISOString();
}

export default async function TeamPage({ params }: PageProps<"/equipo/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const me = claims?.claims?.sub;
  if (!me) redirect(`/entrar?next=/equipo/${id}`);

  const { data: team } = await supabase.from("teams").select("id, name, description, game_id, owner_id, created_at").eq("id", id).maybeSingle();
  if (!team) notFound();
  // Quedadas desde hace 3 horas (la que está en marcha sigue visible).
  const since = hoursAgo(3);
  const [{ data: members }, { data: invites }, { data: msgs }, games, { data: events }, { data: modes }] = await Promise.all([
    supabase.from("team_members").select("user_id, role, joined_at").eq("team_id", id).order("joined_at"),
    // La RLS solo enseña las invitaciones a los miembros.
    supabase.from("team_invites").select("id, user_id").eq("team_id", id).eq("status", "pending"),
    supabase.from("team_messages").select("id, user_id, body, created_at").eq("team_id", id).order("id", { ascending: false }).limit(100),
    loadGames(),
    supabase
      .from("team_events")
      .select("id, starts_at, note, created_by, lobby_id, team_event_rsvps(user_id, answer)")
      .eq("team_id", id)
      .gte("starts_at", since)
      .order("starts_at"),
    supabase.from("game_modes").select("slug, name").eq("game_id", team.game_id).eq("active", true).order("sort"),
  ]);
  const list = members ?? [];
  const isMember = list.some((m) => m.user_id === me);
  const isOwner = team.owner_id === me;
  const names = await loadNames(supabase, [...list.map((m) => m.user_id), ...(invites ?? []).map((i) => i.user_id), ...(msgs ?? []).map((m) => m.user_id)]);
  const gameName = games.find((g) => g.id === team.game_id)?.name ?? team.game_id;

  return (
    <section className="flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link href="/mis-equipos" className="inline-flex min-h-11 items-center self-start text-sm text-muted hover:text-text">
          ← Mis equipos
        </Link>
        <p className="kicker">Equipo de {gameName}</p>
        <h1 className="font-display text-3xl font-semibold">{team.name}</h1>
        {team.description && <p className="text-muted">{team.description}</p>}
      </header>

      <section aria-labelledby="miembros" className="surface hud flex flex-col gap-3 p-5">
        <h2 id="miembros" className="font-semibold">
          Miembros ({list.length}/{TEAM_MAX_MEMBERS})
        </h2>
        <ul className="flex flex-col gap-2">
          {list.map((m) => {
            const p = names.get(m.user_id) ?? { name: "Jugador", avatar: null };
            return (
              <li key={m.user_id} className="flex items-center gap-3">
                {p.avatar ? (
                  <Image src={p.avatar} alt="" width={32} height={32} className="size-8 rounded-full" />
                ) : (
                  <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-full bg-panel-hover text-xs font-semibold">
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <Link href={`/jugador/${m.user_id}`} className="flex-1 hover:underline">
                  {m.user_id === me ? `${p.name} (tú)` : p.name}
                </Link>
                {m.role === "owner" && <span className="text-xs text-accent-soft">Dueño</span>}
                {isOwner && m.role !== "owner" && <LeaveTeam teamId={id} userId={m.user_id} name={p.name} />}
              </li>
            );
          })}
        </ul>
        {isMember && (invites ?? []).length > 0 && (
          <>
            <h3 className="text-sm text-muted">Invitaciones pendientes</h3>
            <ul className="flex flex-col gap-1">
              {invites!.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-2 text-sm">
                  {names.get(i.user_id)?.name ?? "Jugador"}
                  {isOwner && <CancelInvite inviteId={i.id} teamId={id} name={names.get(i.user_id)?.name ?? "Jugador"} />}
                </li>
              ))}
            </ul>
          </>
        )}
        {isOwner && <p className="text-xs text-muted">Para invitar a alguien, abre su perfil y pulsa «Invitar a mi equipo».</p>}
      </section>

      {isMember && (
        <TeamEvents
          teamId={id}
          me={me}
          isOwner={isOwner}
          modes={modes ?? []}
          names={Object.fromEntries([...names].map(([k, v]) => [k, v.name]))}
          events={(events ?? []).map((e) => ({
            id: e.id,
            starts_at: e.starts_at,
            note: e.note,
            created_by: e.created_by,
            lobby_id: e.lobby_id,
            rsvps: e.team_event_rsvps as TeamEvent["rsvps"],
          }))}
        />
      )}

      {isMember ? (
        <TeamChat
          teamId={id}
          me={me}
          initial={(msgs ?? []).toReversed()}
          names={Object.fromEntries([...names].map(([k, v]) => [k, v.name]))}
        />
      ) : (
        <p className="surface p-5 text-sm text-muted">El chat solo lo ven los miembros. Para entrar, su dueño tiene que invitarte.</p>
      )}

      {isMember && (
        <section aria-labelledby="ajustes-equipo" className="flex flex-col gap-3 surface p-5">
          <h2 id="ajustes-equipo" className="font-semibold">
            Ajustes
          </h2>
          {isOwner ? (
            <>
              <EditTeamForm teamId={id} name={team.name} description={team.description ?? ""} />
              <DeleteTeam teamId={id} name={team.name} />
            </>
          ) : (
            <LeaveTeam teamId={id} />
          )}
        </section>
      )}
    </section>
  );
}
