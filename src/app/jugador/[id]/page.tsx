import { currentGame } from "@/lib/games";
import { getLocale, getTranslations } from "next-intl/server";
import { titled } from "@/lib/i18n/metadata";
import { INTL_LOCALE } from "@/lib/i18n/locale";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { CHARACTER_STATUS, type CharacterStatus } from "@/lib/profile/options";
import { loadCatalog, loadPublicProfile } from "@/lib/profile/queries";
import { CharacterIcon } from "@/components/game-icons";
import { NumberRoll } from "@/components/number-roll";
import { rankTier, weekLabel } from "@/lib/ranking";
import { matchSummary } from "@/lib/matches";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/supabase/env";
import { SOCIALS } from "@/lib/profile/schema";
import { BlockButton, ReportForm } from "../../confianza/forms";
import { StartConversationButton } from "../../mensajes/start-button";
import { InviteToTeam } from "../../mis-equipos/forms";
import { parseReliability } from "@/lib/reliability";
import { ReliabilitySection } from "./reliability";
import { ShareCardLink } from "./share-card";

type Badges = {
  cards: { game_id: string; owned: number; total: number; legendary: string[] }[];
  clip_awards: { week_start: string; emblem: string; clip_id: string; title: string; game_id: string }[];
  rank_awards?: { game_id: string; week_start: string; pos: number; points: number }[];
};

// Perfiles: datos personales, fuera de los buscadores aunque sean públicos.
export const generateMetadata = titled("player", { robots: { index: false, follow: false } });

function Row({ title, value }: { title: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[10rem_1fr]">
      <dt className="text-sm text-muted">{title}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

/** null = oculto por privacidad; [] = sin rellenar. `label` da el texto de cada opción. */
function list(values: string[] | null, label: (v: string) => string, t: (k: "hidden" | "unset") => string) {
  if (values == null) return <span className="text-muted">{t("hidden")}</span>;
  if (values.length === 0) return <span className="text-muted">{t("unset")}</span>;
  return values.map(label).join(" · ");
}

export default async function PlayerPage({ params }: PageProps<"/jugador/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const [{ data: claims }, catalog, data, { games }] = await Promise.all([
    supabase.auth.getClaims(),
    currentGame().then(({ game }) => loadCatalog(supabase, game.id).then((c) => ({ ...c, game }))),
    currentGame().then(({ game }) => loadPublicProfile(supabase, id, game.id)),
    currentGame(),
  ]);
  if (!data.profile) notFound();
  const [t, to, tr, locale] = await Promise.all([getTranslations("player"), getTranslations("options"), getTranslations("ranking"), getLocale()]);
  const opt = (group: "languages" | "availability" | "goals" | "voice" | "karmaTags", v: string) =>
    to.has(`${group}.${v}` as never) ? to(`${group}.${v}` as never) : v;
  const weekFmt = new Intl.DateTimeFormat(INTL_LOCALE[locale], { day: "numeric", month: "short", timeZone: "UTC" });

  const { profile, game, roles, characters } = data;
  const viewer = claims?.claims?.sub;
  const isOwner = viewer === id;
  const [{ data: karma }, { data: myBlock }, { data: badgeData }, { data: matches }, { data: teams }, { data: reliabilityRaw }] = await Promise.all([
    viewer ? supabase.rpc("karma_summary", { p_user: id }) : Promise.resolve({ data: null }),
    viewer && !isOwner ? supabase.from("user_blocks").select("blocked_id").eq("blocked_id", id).maybeSingle() : Promise.resolve({ data: null }),
    viewer ? supabase.rpc("player_badges", { p_user: id }) : Promise.resolve({ data: null }),
    // La RLS solo devuelve las partidas si su dueño las deja ver a quien mira.
    supabase
      .from("manual_matches")
      .select("id, played_on, map_name, result, placement, kills, deaths, assists")
      .eq("user_id", id)
      .eq("game_id", catalog.game.id)
      .order("played_on", { ascending: false })
      .limit(50),
    viewer
      ? supabase.from("team_members").select("team_id, role, teams(id, name, game_id)").eq("user_id", id)
      : Promise.resolve({ data: null }),
    viewer ? supabase.rpc("player_reliability", { p_user: id }) : Promise.resolve({ data: null }),
  ]);
  // Mis equipos de este juego a los que puedo invitarle (soy el dueño y aún no es miembro).
  const { data: ownTeams } =
    viewer && !isOwner && !myBlock
      ? await supabase.from("teams").select("id, name").eq("owner_id", viewer).eq("game_id", catalog.game.id)
      : { data: null };
  // Tarjeta para compartir (solo la gestiona su dueño).
  const [{ data: own }, { data: ownGame }] = isOwner
    ? await Promise.all([
        supabase.from("profiles").select("share_card").eq("id", id).single(),
        supabase.from("game_profiles").select("visibility").eq("user_id", id).eq("game_id", catalog.game.id).maybeSingle(),
      ])
    : [{ data: null }, { data: null }];
  const theirTeams = new Set((teams ?? []).map((t) => t.team_id));
  const invitable = (ownTeams ?? []).filter((t) => !theirTeams.has(t.id));
  const matchList = matches ?? [];
  const ms = matchSummary(matchList);
  const badges = badgeData as Badges | null;
  const gameName = (gid: string) => games.find((g) => g.id === gid)?.name ?? gid;
  const socials = (Object.keys(SOCIALS) as (keyof typeof SOCIALS)[]).flatMap((key) => {
    const h = profile[key];
    return h ? [{ key, handle: h, ...SOCIALS[key] }] : [];
  });
  const k = karma?.[0];
  const tOwner = t("owner");
  const name = profile.display_name ?? t("player");
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
            {t("editProfile")}
          </Link>
        )}
        {viewer && !isOwner && !myBlock && profile.dm_policy === "registered" && <StartConversationButton userId={id} />}
        {viewer && !isOwner && !myBlock && profile.dm_policy === "none" && (
          <p className="text-sm text-muted">{t("noDms")}</p>
        )}
      </header>

      <section aria-labelledby="sobre" className="surface p-5">
        <h2 id="sobre" className="font-semibold">
          {isOwner ? t("aboutYou") : t("aboutPlayer")}
        </h2>
        <dl className="mt-4 flex flex-col gap-3">
          <Row title={t("languages")} value={list(profile.languages, (v) => opt("languages", v), t)} />
          <Row title={t("availability")} value={list(profile.availability, (v) => opt("availability", v), t)} />
          <Row title={t("goals")} value={list(profile.goals, (v) => opt("goals", v), t)} />
          <Row
            title={t("voice")}
            value={profile.voice ? opt("voice", profile.voice) : <span className="text-muted">{t("unsetOrHidden")}</span>}
          />
          <Row
            title={t("socials")}
            value={
              socials.length ? (
                <ul className="flex flex-wrap gap-x-4">
                  {socials.map((s) => (
                    <li key={s.key}>
                      <a
                        href={s.url(s.handle)}
                        rel="noopener noreferrer nofollow ugc"
                        target="_blank"
                        className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-accent-soft"
                      >
                        {s.label}: {s.handle}
                        <span className="sr-only"> {t("newTab")}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-muted">{t("socialsUnset")}</span>
              )
            }
          />
        </dl>
      </section>

      {badges && (badges.cards.length > 0 || badges.clip_awards.length > 0 || (badges.rank_awards?.length ?? 0) > 0) && (
        <section aria-labelledby="insignias" className="surface p-5">
          <h2 id="insignias" className="font-semibold">
            {t("badges")}
          </h2>
          {(badges.rank_awards?.length ?? 0) > 0 && (
            <>
              <h3 className="mt-4 text-sm text-muted">{t("weeklyRanking")}</h3>
              <ul className="mt-2 flex flex-col gap-1">
                {badges.rank_awards!.map((a) => (
                  <li key={`${a.game_id}-${a.week_start}`} className="text-sm">
                    <span className="font-semibold text-accent-soft">{tr(`tier.${rankTier(a.pos)}`)}</span> · #{a.pos} ·{" "}
                    {t("rankAward", { game: gameName(a.game_id), week: weekLabel(a.week_start, locale), points: a.points })}
                  </li>
                ))}
              </ul>
            </>
          )}
          {badges.clip_awards.length > 0 && (
            <>
              <h3 className="mt-4 text-sm text-muted">{t("clipAwards")}</h3>
              <ul className="mt-2 flex flex-col gap-1">
                {badges.clip_awards.map((a) => (
                  <li key={`${a.week_start}-${a.emblem}-${a.clip_id}`} className="text-sm">
                    <span className="font-semibold text-accent-soft">{a.emblem}</span> · {gameName(a.game_id)} ·{" "}
                    {t("weekOf", { date: weekFmt.format(new Date(a.week_start)) })} ·{" "}
                    <Link href={`/clips/${a.clip_id}`} className="underline underline-offset-4">
                      {a.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
          {badges.cards.length > 0 && (
            <>
              <h3 className="mt-4 text-sm text-muted">{t("cards")}</h3>
              <ul className="mt-2 flex flex-col gap-1">
                {badges.cards.map((c) => (
                  <li key={c.game_id} className="text-sm">
                    {t("cardsCount", { game: gameName(c.game_id), owned: c.owned, total: c.total })}
                    {c.legendary.length > 0 && <span className="text-muted"> · {t("legendary", { names: c.legendary.join(", ") })}</span>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      <section aria-labelledby="karma" className="surface p-5">
        <h2 id="karma" className="font-semibold">
          Karma
        </h2>
        {!viewer ? (
          <p className="mt-2 text-sm text-muted">{t("karmaSignIn")}</p>
        ) : k && Number(k.positives) > 0 ? (
          <>
            <p className="mt-2 text-sm">
              <NumberRoll value={Number(k.positives)} className="font-semibold" /> {t("karmaCount", { count: Number(k.positives) })}
            </p>
            {k.top_tags.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2">
                {k.top_tags.map((tag) => (
                  <li key={tag} className="rounded border border-line px-2 py-0.5 text-xs text-muted">
                    {opt("karmaTags", tag)}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">{t("karmaNone")}</p>
        )}
        <p className="mt-3 text-xs text-muted">{t("karmaNote")}</p>
      </section>

      <ReliabilitySection data={parseReliability(reliabilityRaw)} signedIn={Boolean(viewer)} />

      {isOwner && own && (
        <ShareCardLink
          enabled={own.share_card}
          gamePublic={ownGame?.visibility === "public"}
          url={`${siteUrl()}/tarjeta/${id}/${catalog.game.id}`}
        />
      )}

      <section aria-labelledby="valorant" className="surface p-5">
        <h2 id="valorant" className="font-semibold">
          {catalog.game.name}
        </h2>
        {game ? (
          <dl className="mt-4 flex flex-col gap-3">
            <Row
              title={t("rank")}
              value={
                rank ? (
                  <span className="inline-flex items-center gap-2">
                    {rankRow?.icon_url && <Image src={rankRow.icon_url} alt="" width={28} height={28} />}
                    <span>
                      <span>{rank}</span>{" "}
                      <span className="text-muted">· {t("manual")}</span>
                    </span>
                  </span>
                ) : (
                  <span className="text-muted">{t("unset")}</span>
                )
              }
            />
            <Row title={t("region")} value={region ?? <span className="text-muted">{t("unset")}</span>} />
            <Row
              title={t("modes")}
              value={
                game.mode_slugs?.length ? (
                  game.mode_slugs.map((s) => catalog.modes.find((m) => m.slug === s)?.name ?? s).join(" · ")
                ) : (
                  <span className="text-muted">{t("unset")}</span>
                )
              }
            />
            <Row
              title={t("roles")}
              value={
                roles.length ? (
                  roles
                    .toSorted((a, b) => Number(b.is_primary) - Number(a.is_primary))
                    .map((r) => `${roleName.get(r.role_id!)}${r.is_primary ? ` ${t("primary")}` : ""}`)
                    .join(" · ")
                ) : (
                  <span className="text-muted">{t("unset")}</span>
                )
              }
            />
            <Row
              title={catalog.game.character_label ?? t("characters")}
              value={
                byStatus.length ? (
                  <ul className="flex flex-col gap-3">
                    {byStatus.map((g) => (
                      <li key={g.s} className="flex flex-col gap-1.5">
                        <span className="text-sm text-muted">{to(`characterStatus.${g.s}`)}</span>
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
                  <span className="text-muted">{t("unset")}</span>
                )
              }
            />
          </dl>
        ) : (
          <p className="mt-3 text-sm text-muted">
            {isOwner ? t("emptyOwn", { game: catalog.game.name }) : t("emptyOther", { game: catalog.game.name })}
          </p>
        )}
        {catalog.game.id === "valorant" && (
          <p className="mt-4 inline-block rounded border border-line px-2 py-1 text-xs text-muted">
            {t("riot")}
          </p>
        )}
      </section>

      {(matchList.length > 0 || isOwner) && (
        <section aria-labelledby="partidas" className="surface p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="partidas" className="font-semibold">
              {t("matches", { game: catalog.game.name })}
            </h2>
            {isOwner && (
              <Link href="/perfil/partidas" className="text-sm text-accent-soft underline underline-offset-4">
                {t("logMatches")}
              </Link>
            )}
          </div>
          {matchList.length === 0 ? (
            <p className="mt-2 text-sm text-muted">{t("noMatches")}</p>
          ) : (
            <>
              <p className="mt-2 text-sm">
                {t("matchCount", { count: ms.total })}
                {ms.winRate != null && ` · ${t("winRate", { rate: ms.winRate })}`}
                {ms.kd != null && ` · K/D ${ms.kd.toLocaleString(INTL_LOCALE[locale])}`}
              </p>
              <ul className="mt-2 flex flex-col gap-1 text-sm text-muted">
                {matchList.slice(0, 5).map((m) => (
                  <li key={m.id}>
                    {m.played_on} · {m.result ? to(`matchResults.${m.result}`) : m.placement ? t("placement", { n: m.placement }) : t("noResult")}
                    {m.map_name && ` · ${m.map_name}`}
                    {m.kills != null && ` · ${m.kills}/${m.deaths ?? "–"}/${m.assists ?? "–"}`}
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="mt-3 inline-block rounded border border-line px-2 py-1 text-xs text-muted">
            {t("matchesNote")}
          </p>
        </section>
      )}

      {teams && teams.length > 0 && (
        <section aria-labelledby="equipos" className="surface p-5">
          <h2 id="equipos" className="font-semibold">
            {t("teams")}
          </h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {teams.map((t) =>
              t.teams ? (
                <li key={t.team_id}>
                  <Link href={`/equipo/${t.team_id}`} className="btn-ghost">
                    {t.teams.name}
                    <span className="text-xs text-muted">
                      {gameName(t.teams.game_id)}
                      {t.role === "owner" ? ` · ${tOwner}` : ""}
                    </span>
                  </Link>
                </li>
              ) : null,
            )}
          </ul>
        </section>
      )}

      {viewer && !isOwner && (
        <section aria-labelledby="seguridad" className="flex flex-col gap-2 surface p-5">
          <h2 id="seguridad" className="font-semibold">
            {t("safety")}
          </h2>
          {myBlock && <p className="text-sm text-muted">{t("blocked")}</p>}
          {invitable.length > 0 && <InviteToTeam userId={id} teams={invitable} />}
          <BlockButton userId={id} blocked={Boolean(myBlock)} name={name} />
          <ReportForm targetId={id} label={t("report")} />
        </section>
      )}
    </article>
  );
}
