import { currentGame } from "@/lib/games";
import { getLocale, getTranslations } from "next-intl/server";
import { titled } from "@/lib/i18n/metadata";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatStart } from "@/lib/lobbies/format";
import { listOpenLobbies, loadNames } from "@/lib/lobbies/queries";
import { LANGUAGES, optionKeys } from "@/lib/profile/options";
import { loadCatalog } from "@/lib/profile/queries";
import type { CSSProperties } from "react";
import { AvatarGroup } from "@/components/avatar-group";
import { RoleIcon } from "@/components/game-icons";
import { createClient } from "@/lib/supabase/server";

export const generateMetadata = titled("lobbies");

const control = "min-h-11 w-full rounded-md border border-line bg-bg px-3 text-sm text-text focus:border-accent";
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export default async function LobbiesPage({ searchParams }: PageProps<"/grupos">) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/entrar?next=/grupos");

  const { game } = await currentGame();
  const catalog = await loadCatalog(supabase, game.id);
  const sp = await searchParams;
  const mode = catalog.modes.find((m) => m.slug === one(sp.mode))?.slug;
  const region = catalog.regions.find((r) => r.slug === one(sp.region));
  const role = catalog.roles.find((r) => r.slug === one(sp.role));
  const lang = one(sp.lang) && one(sp.lang)! in LANGUAGES ? one(sp.lang) : undefined;

  const [lobbies, { data: myRoles }] = await Promise.all([
    listOpenLobbies(supabase, { gameId: game.id, mode, regionId: region?.id, roleId: role?.id, lang }),
    supabase.from("player_roles").select("role_id").eq("user_id", claims.claims.sub).eq("game_id", game.id),
  ]);
  const names = await loadNames(supabase, lobbies.flatMap((l) => [l.owner_id, ...l.lobby_members.map((m) => m.user_id)]));
  const mine = new Set((myRoles ?? []).map((r) => r.role_id));
  const label = (list: { id: string; name: string }[], id: string | null) => list.find((x) => x.id === id)?.name;
  const filtered = Boolean(mode || region || role || lang);
  const [t, to, ts, locale] = await Promise.all([getTranslations("lobbies"), getTranslations("options"), getTranslations("shared"), getLocale()]);

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">{t("title")}</h1>
          <p className="text-muted">{t("lead", { game: game.name })}</p>
        </div>
        <Link
          href="/grupos/nuevo"
          className="btn-primary"
        >
          {t("create")}
        </Link>
      </div>

      <form method="get" action="/grupos" className="grid grid-cols-2 gap-3 surface p-4 lg:grid-cols-5">
        {[
          ["mode", t("filterMode"), catalog.modes.map((m) => [m.slug, m.name]), mode],
          ["role", t("filterRole"), catalog.roles.map((r) => [r.slug, r.name]), role?.slug],
          ["region", t("filterRegion"), catalog.regions.map((r) => [r.slug, r.name]), region?.slug],
          ["lang", t("filterLang"), optionKeys(LANGUAGES).map((k) => [k, to(`languages.${k}`)]), lang],
        ].map(([name, text, options, value]) => (
          <div key={name as string} className="flex flex-col gap-1 text-sm font-medium">
            <label htmlFor={`g-${name}`}>{text as string}</label>
            <select id={`g-${name}`} name={name as string} defaultValue={(value as string) ?? ""} className={control}>
              <option value="">{t("any")}</option>
              {(options as string[][]).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        ))}
        <div className="col-span-2 flex items-end gap-3 lg:col-span-1">
          <button type="submit" className="btn-ghost">
            {t("filter")}
          </button>
          {filtered && (
            <Link href="/grupos" className="min-h-11 py-3 text-sm text-accent-soft underline underline-offset-4">
              {t("clear")}
            </Link>
          )}
        </div>
      </form>

      {lobbies.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line p-6 text-center">
          <h2 className="font-semibold">{filtered ? t("emptyFiltered") : t("empty")}</h2>
          <p className="mt-1 text-sm text-muted">{t("emptyText")}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-3">
            <Link href="/grupos/nuevo" className="btn-ghost">
              {t("create")}
            </Link>
            <Link href="/buscar" className="btn-ghost">
              {t("searchPlayers")}
            </Link>
          </div>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lobbies.map((l, i) => {
            const taken = l.lobby_members.length;
            // Haz de luz: el grupo busca uno de tus roles (y no estás dentro ni es tuyo).
            const forYou =
              l.owner_id !== claims.claims.sub &&
              !l.lobby_members.some((m) => m.user_id === claims.claims.sub) &&
              l.lobby_needed_roles.some((r) => mine.has(r.role_id));
            const modeName = catalog.modes.find((m) => m.slug === l.mode_slug)?.name ?? l.mode_slug;
            const ranks = [label(catalog.ranks, l.rank_min_id), label(catalog.ranks, l.rank_max_id)];
            const owner = names.get(l.owner_id)?.name ?? t("player");
            return (
              <li
                key={l.id}
                className={`surface surface-interactive spotlight group enter flex flex-col gap-3 p-4 ${forYou ? "beam" : ""}`}
                style={{ "--i": i } as CSSProperties}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {forYou && <p className="kicker">{t("forYou")}</p>}
                    <h2 className="font-display text-lg font-semibold">{modeName}</h2>
                    <p className="text-sm text-muted">{t("byOwner", { owner })}</p>
                  </div>
                  <span className="whitespace-nowrap text-sm font-medium tabular-nums">
                    {t("slots", { taken, slots: l.slots })}
                  </span>
                </div>
                <AvatarGroup
                  slots={l.slots}
                  members={l.lobby_members.map((m) => ({
                    id: m.user_id,
                    name: names.get(m.user_id)?.name ?? t("player"),
                    avatar: names.get(m.user_id)?.avatar ?? null,
                  }))}
                />
                {l.note && <p className="text-sm">{l.note}</p>}
                <dl className="grid gap-1 text-sm">
                  <div className="flex gap-2">
                    <dt className="text-muted">{ts("lookingLabel")}</dt>
                    <dd className="flex flex-wrap gap-1.5">
                      {l.lobby_needed_roles.length
                        ? l.lobby_needed_roles.map((r) => {
                            const role = catalog.roles.find((x) => x.id === r.role_id);
                            return (
                              <span key={r.role_id} className="chip">
                                <RoleIcon slug={role?.slug} className="size-3.5 text-muted" />
                                {role?.name}
                              </span>
                            );
                          })
                        : ts("anyRole")}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-muted">{ts("rankLabel")}</dt>
                    <dd>{ranks[0] || ranks[1] ? ts("rankRange", { min: ranks[0] ?? "—", max: ranks[1] ?? "—" }) : ts("anyRank")}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-muted">{ts("whenLabel")}</dt>
                    <dd>{formatStart(l.starts_at, locale)}</dd>
                  </div>
                  {(l.region_id || l.language || l.goal) && (
                    <div className="flex gap-2">
                      <dt className="text-muted">{ts("moreLabel")}</dt>
                      <dd>
                        {[
                          label(catalog.regions, l.region_id),
                          l.language ? to(`languages.${l.language}` as never) : null,
                          l.goal ? to(`goals.${l.goal}` as never) : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </dd>
                    </div>
                  )}
                </dl>
                <Link
                  href={`/grupos/${l.id}`}
                  className="mt-auto inline-flex min-h-11 items-center justify-center rounded-md border border-line px-4 text-sm hover:bg-panel-hover"
                  aria-label={t("viewLabel", { mode: modeName, owner })}
                >
                  {t("view")}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
