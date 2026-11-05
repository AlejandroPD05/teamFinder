import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { formatStart, REQUEST_LABEL, STATUS_LABEL } from "@/lib/lobbies/format";
import { loadLobby, loadNames } from "@/lib/lobbies/queries";
import { GOALS, LANGUAGES } from "@/lib/profile/options";
import { loadCatalog } from "@/lib/profile/queries";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "./action-form";
import { LobbyChat } from "./lobby-chat";
import { KarmaVote } from "../../confianza/forms";
import { RankBadge, RoleIcon } from "@/components/game-icons";

export const metadata: Metadata = { title: "Grupo" };

/** ¿Se cerró hace menos de `days` días? (fuera del render para que la regla de pureza no se queje). */
function closedWithin(iso: string | null, days: number) {
  return iso != null && Date.parse(iso) > Date.now() - days * 86_400_000;
}

function Avatar({ name, src }: { name: string; src: string | null }) {
  return src ? (
    <Image src={src} alt="" width={36} height={36} className="rounded-full" />
  ) : (
    <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-full bg-bg text-sm font-semibold">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export default async function LobbyPage({ params }: PageProps<"/grupos/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const me = claims?.claims?.sub;
  if (!me) redirect(`/entrar?next=/grupos/${id}`);

  const [catalog, data] = await Promise.all([loadCatalog(supabase), loadLobby(supabase, id)]);
  if (!data) notFound();
  const { lobby, members, neededRoles, requests } = data;
  const names = await loadNames(supabase, [lobby.owner_id, ...members.map((m) => m.user_id), ...requests.map((r) => r.user_id)]);
  const name = (uid: string) => names.get(uid)?.name ?? "Jugador";

  const isOwner = lobby.owner_id === me;
  const isMember = members.some((m) => m.user_id === me);
  // Últimos 50 mensajes (la RLS solo los devuelve a miembros).
  const messages = isMember
    ? ((await supabase.from("lobby_messages").select("id, user_id, body, created_at").eq("lobby_id", id).order("id", { ascending: false }).limit(50)).data ?? []).reverse()
    : [];
  // Abrir la sala la marca como leída (en el servidor: no depende de que el navegador termine la llamada).
  if (isMember) await supabase.rpc("mark_read", { p_lobby: id });
  // Karma: en grupos cerrados (hasta 7 días), a los compañeros que aún no has valorado.
  const canVote =
    isMember && lobby.status === "closed" && closedWithin(lobby.closed_at, 7);
  const voted = canVote
    ? new Set(((await supabase.from("karma_votes").select("target_id").eq("lobby_id", id)).data ?? []).map((v) => v.target_id))
    : new Set<string>();
  const toVote = canVote ? members.filter((m) => m.user_id !== me && !voted.has(m.user_id)) : [];
  const myRequest = requests.find((r) => r.user_id === me && r.status === "pending");
  const pending = requests.filter((r) => r.status === "pending");
  const modeName = catalog.modes.find((m) => m.slug === lobby.mode_slug)?.name ?? lobby.mode_slug;
  const rankRow = (rid: string | null) => {
    const r = catalog.ranks.find((x) => x.id === rid);
    return r ? { name: r.name, src: r.icon_url, color: r.color } : null;
  };
  const roleOf = (rid: string) => catalog.roles.find((r) => r.id === rid);
  const free = lobby.slots - members.length;

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">
            <Link href="/grupos" className="underline underline-offset-4">
              Grupos
            </Link>{" "}
            / {modeName}
          </p>
          <h1 className="font-display text-3xl font-semibold">
            {modeName} de {name(lobby.owner_id)}
          </h1>
          {lobby.note && <p className="mt-1">{lobby.note}</p>}
        </div>
        <span
          className={`rounded border px-2 py-1 text-sm ${lobby.status === "open" ? "border-success/50 text-success" : "border-line text-muted"}`}
        >
          {STATUS_LABEL[lobby.status]} · {members.length}/{lobby.slots} plazas
        </span>
      </header>

      <section aria-labelledby="detalles" className="surface p-5">
        <h2 id="detalles" className="font-semibold">
          Detalles
        </h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Buscan</dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {neededRoles.length
                ? neededRoles.map((r) => (
                    <span key={r} className="chip">
                      <RoleIcon slug={roleOf(r)?.slug} className="size-3.5 text-accent-soft" />
                      {roleOf(r)?.name}
                    </span>
                  ))
                : "Cualquier rol"}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Rango</dt>
            <dd>
              {lobby.rank_min_id || lobby.rank_max_id ? (
                <span className="inline-flex flex-wrap items-center gap-2">
                  {rankRow(lobby.rank_min_id) ? <RankBadge {...rankRow(lobby.rank_min_id)!} manual={false} size={20} /> : "—"}
                  <span className="text-muted">a</span>
                  {rankRow(lobby.rank_max_id) ? <RankBadge {...rankRow(lobby.rank_max_id)!} manual={false} size={20} /> : "—"}
                </span>
              ) : (
                "Cualquiera"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Cuándo</dt>
            <dd>{formatStart(lobby.starts_at)}</dd>
          </div>
          <div>
            <dt className="text-muted">Servidor · idioma · objetivo</dt>
            <dd>
              {[
                catalog.regions.find((r) => r.id === lobby.region_id)?.name ?? "Cualquier servidor",
                lobby.language ? LANGUAGES[lobby.language as keyof typeof LANGUAGES] : "Cualquier idioma",
                lobby.goal ? GOALS[lobby.goal as keyof typeof GOALS] : "Cualquier objetivo",
              ].join(" · ")}
            </dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="miembros" className="surface p-5">
        <h2 id="miembros" className="font-semibold">
          Miembros ({members.length}/{lobby.slots})
        </h2>
        <ul className="mt-3 flex flex-col gap-2">
          {members.map((m) => (
            <li key={m.user_id} className="flex items-center gap-3">
              <Avatar name={name(m.user_id)} src={names.get(m.user_id)?.avatar ?? null} />
              <Link href={`/jugador/${m.user_id}`} className="underline underline-offset-4">
                {name(m.user_id)}
              </Link>
              {m.user_id === lobby.owner_id && <span className="text-xs text-muted">creador</span>}
            </li>
          ))}
          {Array.from({ length: Math.max(0, free) }).map((_, i) => (
            <li key={`free-${i}`} className="flex items-center gap-3 text-sm text-muted">
              <span aria-hidden="true" className="size-9 rounded-full border border-dashed border-line" />
              Plaza libre
            </li>
          ))}
        </ul>
      </section>

      {isMember && (
        <LobbyChat
          lobbyId={lobby.id}
          me={me}
          initial={messages}
          names={Object.fromEntries([...names].map(([k, v]) => [k, v.name]))}
          closed={lobby.status === "closed"}
        />
      )}

      {canVote && (
        <section aria-labelledby="valorar" className="flex flex-col gap-4 surface p-5">
          <h2 id="valorar" className="font-semibold">
            Reconoce a tus compañeros
          </h2>
          {toVote.length === 0 ? (
            <p className="text-sm text-muted">Ya has reconocido a todos. ¡Gracias!</p>
          ) : (
            toVote.map((m) => <KarmaVote key={m.user_id} lobbyId={lobby.id} targetId={m.user_id} name={name(m.user_id)} />)
          )}
          <p className="text-xs text-muted">Opcional: un reconocimiento por compañero y grupo. Solo positivo; aquí no se puntúa mal a nadie.</p>
        </section>
      )}

      {!isOwner && !isMember && lobby.status === "open" && (
        <section aria-labelledby="unirse" className="surface p-5">
          <h2 id="unirse" className="font-semibold">
            Unirse
          </h2>
          <div className="mt-3">
            {myRequest ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm">Tu solicitud está pendiente de respuesta.</p>
                <ActionForm lobbyId={lobby.id} intent="withdraw" label="Retirar solicitud" />
              </div>
            ) : (
              <ActionForm lobbyId={lobby.id} intent="request" label="Solicitar unirme" variant="primary" withMessage />
            )}
          </div>
        </section>
      )}

      {!isOwner && !isMember && lobby.status !== "open" && (
        <p className="text-sm text-muted">Este grupo no admite solicitudes ahora mismo.</p>
      )}

      {isOwner && (
        <section aria-labelledby="solicitudes" className="surface p-5">
          <h2 id="solicitudes" className="font-semibold">
            Solicitudes pendientes ({pending.length})
          </h2>
          {pending.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Aún no hay solicitudes.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-4">
              {pending.map((r) => (
                <li key={r.id} className="flex flex-col gap-2 border-t border-line pt-3 first:border-0 first:pt-0">
                  <div className="flex items-center gap-3">
                    <Avatar name={name(r.user_id)} src={names.get(r.user_id)?.avatar ?? null} />
                    <Link href={`/jugador/${r.user_id}`} className="font-medium underline underline-offset-4">
                      {name(r.user_id)}
                    </Link>
                  </div>
                  {r.message && <p className="text-sm">«{r.message}»</p>}
                  <div className="flex flex-wrap gap-3">
                    <ActionForm lobbyId={lobby.id} intent="accept" requestId={r.id} label="Aceptar" variant="primary" />
                    <ActionForm lobbyId={lobby.id} intent="reject" requestId={r.id} label="Rechazar" />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {neededRoles.length > 0 && lobby.status === "open" && (
            <div className="mt-5 border-t border-line pt-4">
              <p className="text-sm text-muted">Sugerencias (orientativas): jugadores que cubren los roles que buscáis.</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {neededRoles.map((rid) => {
                  const role = roleOf(rid);
                  if (!role) return null;
                  const qs = new URLSearchParams({ role: role.slug, mode: lobby.mode_slug });
                  return (
                    <li key={rid}>
                      <Link href={`/buscar?${qs}`} className="btn-ghost">
                        Buscar {role.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {requests.some((r) => r.status !== "pending") && (
            <details className="mt-5 border-t border-line pt-4 text-sm">
              <summary className="min-h-11 cursor-pointer py-2 text-muted">Historial de solicitudes</summary>
              <ul className="mt-2 flex flex-col gap-1">
                {requests
                  .filter((r) => r.status !== "pending")
                  .map((r) => (
                    <li key={r.id}>
                      {name(r.user_id)}: {REQUEST_LABEL[r.status]}
                    </li>
                  ))}
              </ul>
            </details>
          )}
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        {isMember && !isOwner && (
          <ActionForm lobbyId={lobby.id} intent="leave" label="Salir del grupo" variant="danger" confirm="¿Seguro que quieres salir del grupo?" />
        )}
        {isOwner && lobby.status !== "closed" && (
          <ActionForm
            lobbyId={lobby.id}
            intent="close"
            label="Cerrar grupo"
            variant="danger"
            confirm="¿Cerrar el grupo? Las solicitudes pendientes se rechazarán."
          />
        )}
      </div>
    </article>
  );
}
