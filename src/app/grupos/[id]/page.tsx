import { getLocale, getTranslations } from "next-intl/server";
import { titled } from "@/lib/i18n/metadata";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { formatStart } from "@/lib/lobbies/format";
import { loadLobby, loadNames } from "@/lib/lobbies/queries";
import { loadCatalog } from "@/lib/profile/queries";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "./action-form";
import { ShareLobby } from "./share-lobby";
import { siteUrl } from "@/lib/supabase/env";
import { LobbyChat } from "./lobby-chat";
import { KarmaVote } from "../../confianza/forms";
import { RankBadge, RoleIcon } from "@/components/game-icons";

export const generateMetadata = titled("lobby");

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

  const data = await loadLobby(supabase, id);
  if (!data) notFound();
  const catalog = await loadCatalog(supabase, data.lobby.game_id);
  const { lobby, members, neededRoles, requests } = data;
  const names = await loadNames(supabase, [lobby.owner_id, ...members.map((m) => m.user_id), ...requests.map((r) => r.user_id)]);
  const [t, to, ts, locale] = await Promise.all([getTranslations("lobby"), getTranslations("options"), getTranslations("shared"), getLocale()]);
  const name = (uid: string) => names.get(uid)?.name ?? t("player");

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
              {t("breadcrumb")}
            </Link>{" "}
            / {modeName}
          </p>
          <h1 className="font-display text-3xl font-semibold">
            {t("title", { mode: modeName, owner: name(lobby.owner_id) })}
          </h1>
          {lobby.note && <p className="mt-1">{lobby.note}</p>}
        </div>
        <span
          className={`text-sm font-medium ${lobby.status === "open" ? "text-success" : "text-muted"}`}
        >
          {to(`lobbyStatus.${lobby.status}`)} · {t("slots", { taken: members.length, slots: lobby.slots })}
        </span>
      </header>

      <section aria-labelledby="detalles" className="surface p-5">
        <h2 id="detalles" className="font-semibold">
          {t("details")}
        </h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">{t("looking")}</dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {neededRoles.length
                ? neededRoles.map((r) => (
                    <span key={r} className="chip">
                      <RoleIcon slug={roleOf(r)?.slug} className="size-3.5 text-muted" />
                      {roleOf(r)?.name}
                    </span>
                  ))
                : ts("anyRole")}
            </dd>
          </div>
          <div>
            <dt className="text-muted">{t("rank")}</dt>
            <dd>
              {lobby.rank_min_id || lobby.rank_max_id ? (
                <span className="inline-flex flex-wrap items-center gap-2">
                  {rankRow(lobby.rank_min_id) ? <RankBadge {...rankRow(lobby.rank_min_id)!} manual={false} size={20} /> : "—"}
                  <span className="text-muted">{t("to")}</span>
                  {rankRow(lobby.rank_max_id) ? <RankBadge {...rankRow(lobby.rank_max_id)!} manual={false} size={20} /> : "—"}
                </span>
              ) : (
                ts("anyRank")
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted">{t("when")}</dt>
            <dd>{formatStart(lobby.starts_at, locale)}</dd>
          </div>
          <div>
            <dt className="text-muted">{t("extras")}</dt>
            <dd>
              {[
                catalog.regions.find((r) => r.id === lobby.region_id)?.name ?? t("anyRegion"),
                lobby.language ? to(`languages.${lobby.language}` as never) : t("anyLanguage"),
                lobby.goal ? to(`goals.${lobby.goal}` as never) : t("anyGoal"),
              ].join(" · ")}
            </dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="miembros" className="surface p-5">
        <h2 id="miembros" className="font-semibold">
          {t("members", { taken: members.length, slots: lobby.slots })}
        </h2>
        <ul className="mt-3 flex flex-col gap-2">
          {members.map((m) => (
            <li key={m.user_id} className="flex items-center gap-3">
              <Avatar name={name(m.user_id)} src={names.get(m.user_id)?.avatar ?? null} />
              <Link href={`/jugador/${m.user_id}`} className="underline underline-offset-4">
                {name(m.user_id)}
              </Link>
              {m.user_id === lobby.owner_id && <span className="text-xs text-muted">{t("creator")}</span>}
            </li>
          ))}
          {Array.from({ length: Math.max(0, free) }).map((_, i) => (
            <li key={`free-${i}`} className="flex items-center gap-3 text-sm text-muted">
              <span aria-hidden="true" className="size-9 rounded-full border border-dashed border-line" />
              {t("freeSlot")}
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
            {t("voteTitle")}
          </h2>
          {toVote.length === 0 ? (
            <p className="text-sm text-muted">{t("votedAll")}</p>
          ) : (
            toVote.map((m) => <KarmaVote key={m.user_id} lobbyId={lobby.id} targetId={m.user_id} name={name(m.user_id)} />)
          )}
          <p className="text-xs text-muted">{t("voteNote")}</p>
        </section>
      )}

      {!isOwner && !isMember && lobby.status === "open" && (
        <section aria-labelledby="unirse" className="surface p-5">
          <h2 id="unirse" className="font-semibold">
            {t("join")}
          </h2>
          <div className="mt-3">
            {myRequest ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm">{t("pendingRequest")}</p>
                <ActionForm lobbyId={lobby.id} intent="withdraw" label={t("withdraw")} />
              </div>
            ) : (
              <ActionForm lobbyId={lobby.id} intent="request" label={t("request")} variant="primary" withMessage />
            )}
          </div>
        </section>
      )}

      {!isOwner && !isMember && lobby.status !== "open" && (
        <p className="text-sm text-muted">{t("noRequests")}</p>
      )}

      {isOwner && lobby.status !== "closed" && (
        <ShareLobby lobbyId={lobby.id} sharedUrl={lobby.shared_at ? `${siteUrl()}/unete/${lobby.id}` : null} />
      )}

      {isOwner && (
        <section aria-labelledby="solicitudes" className="surface p-5">
          <h2 id="solicitudes" className="font-semibold">
            {t("pendingTitle", { count: pending.length })}
          </h2>
          {pending.length === 0 ? (
            <p className="mt-2 text-sm text-muted">{t("noPending")}</p>
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
                    <ActionForm lobbyId={lobby.id} intent="accept" requestId={r.id} label={t("accept")} variant="primary" />
                    <ActionForm lobbyId={lobby.id} intent="reject" requestId={r.id} label={t("reject")} />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {neededRoles.length > 0 && lobby.status === "open" && (
            <div className="mt-5 border-t border-line pt-4">
              <p className="text-sm text-muted">{t("suggestions")}</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {neededRoles.map((rid) => {
                  const role = roleOf(rid);
                  if (!role) return null;
                  const qs = new URLSearchParams({ role: role.slug, mode: lobby.mode_slug });
                  return (
                    <li key={rid}>
                      <Link href={`/buscar?${qs}`} className="btn-ghost">
                        {t("searchRole", { role: role.name })}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {requests.some((r) => r.status !== "pending") && (
            <details className="mt-5 border-t border-line pt-4 text-sm">
              <summary className="min-h-11 cursor-pointer py-2 text-muted">{t("history")}</summary>
              <ul className="mt-2 flex flex-col gap-1">
                {requests
                  .filter((r) => r.status !== "pending")
                  .map((r) => (
                    <li key={r.id}>
                      {name(r.user_id)}: {to(`requestStatus.${r.status}`)}
                    </li>
                  ))}
              </ul>
            </details>
          )}
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        {isMember && !isOwner && (
          <ActionForm lobbyId={lobby.id} intent="leave" label={t("leave")} variant="danger" confirm={t("leaveConfirm")} />
        )}
        {isOwner && lobby.status !== "closed" && (
          <ActionForm
            lobbyId={lobby.id}
            intent="close"
            label={t("close")}
            variant="danger"
            confirm={t("closeConfirm")}
          />
        )}
      </div>
    </article>
  );
}
