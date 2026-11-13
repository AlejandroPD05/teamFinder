import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentGame } from "@/lib/games";
import { loadNames } from "@/lib/lobbies/queries";
import { createClient } from "@/lib/supabase/server";
import { TEAM_MAX_MEMBERS } from "@/lib/teams";
import { CreateTeamForm, RespondInvite } from "./forms";

export const metadata: Metadata = { title: "Mis equipos" };

export default async function MyTeamsPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const me = claims?.claims?.sub;
  if (!me) redirect("/entrar?next=/mis-equipos");
  const { game, games } = await currentGame();

  const [{ data: memberships }, { data: invites }] = await Promise.all([
    supabase.from("team_members").select("role, teams(id, name, game_id, description, team_members(count))").eq("user_id", me),
    supabase.from("team_invites").select("id, invited_by, teams(id, name, game_id)").eq("user_id", me).eq("status", "pending"),
  ]);
  const gameName = (id: string) => games.find((g) => g.id === id)?.name ?? id;
  const names = await loadNames(supabase, (invites ?? []).map((i) => i.invited_by).filter(Boolean) as string[]);
  const mine = (memberships ?? []).filter((m) => m.teams);

  return (
    <section className="flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-semibold">Mis equipos</h1>
        <p className="text-muted">
          Un equipo es tu grupo de siempre: hasta {TEAM_MAX_MEMBERS} personas de un mismo juego, con su propio chat. Invita a
          alguien desde su perfil.
        </p>
      </header>

      {(invites ?? []).length > 0 && (
        <section aria-labelledby="invitaciones" className="flex flex-col gap-3">
          <h2 id="invitaciones" className="font-display text-xl font-semibold">
            Invitaciones
          </h2>
          <ul className="flex flex-col gap-3">
            {invites!.map((i) =>
              i.teams ? (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 surface hud p-4">
                  <div>
                    <p className="font-semibold">{i.teams.name}</p>
                    <p className="text-sm text-muted">
                      {gameName(i.teams.game_id)} · te invita {names.get(i.invited_by ?? "")?.name ?? "su dueño"}
                    </p>
                  </div>
                  <RespondInvite inviteId={i.id} teamName={i.teams.name} />
                </li>
              ) : null,
            )}
          </ul>
        </section>
      )}

      <section aria-labelledby="tus-equipos" className="flex flex-col gap-3">
        <h2 id="tus-equipos" className="font-display text-xl font-semibold">
          Tus equipos
        </h2>
        {mine.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-muted">Aún no estás en ningún equipo.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {mine.map((m) => (
              <li key={m.teams!.id}>
                <Link href={`/equipo/${m.teams!.id}`} className="surface flex flex-col gap-1 p-4">
                  <span className="font-display text-lg font-semibold">{m.teams!.name}</span>
                  <span className="text-sm text-muted">
                    {gameName(m.teams!.game_id)} · {m.teams!.team_members[0]?.count ?? 1}/{TEAM_MAX_MEMBERS}
                    {m.role === "owner" ? " · eres el dueño" : ""}
                  </span>
                  {m.teams!.description && <span className="truncate text-sm">{m.teams!.description}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <CreateTeamForm gameName={game.name} />
    </section>
  );
}
