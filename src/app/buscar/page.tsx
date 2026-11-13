import { currentGame } from "@/lib/games";
import { getLocale, getTranslations } from "next-intl/server";
import { titled } from "@/lib/i18n/metadata";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AVAILABILITY, CHARACTER_STATUS, GOALS, LANGUAGES, optionKeys, VOICE } from "@/lib/profile/options";
import { loadCatalog } from "@/lib/profile/queries";
import {
  activeCount,
  advancedCount,
  PAGE_SIZE,
  parseFilters,
  toConditions,
  toSearchParams,
  widenSuggestions,
  type Filters,
} from "@/lib/search/filters";
import { searchPlayers } from "@/lib/search/query";
import { createClient } from "@/lib/supabase/server";
import { PlayerCard } from "./player-card";

export const generateMetadata = titled("search");

const control = "min-h-11 w-full rounded-md border border-line bg-bg px-3 text-sm text-text focus:border-accent";
const href = (f: Filters) => {
  const qs = toSearchParams(f).toString();
  return qs ? `/buscar?${qs}` : "/buscar";
};

function Select({
  name,
  label,
  value,
  options,
  any,
}: {
  name: string;
  label: string;
  value?: string;
  options: [string, string][];
  any: string;
}) {
  return (
    <div className="flex flex-col gap-1 text-sm font-medium">
      <label htmlFor={`f-${name}`}>{label}</label>
      <select id={`f-${name}`} name={name} defaultValue={value ?? ""} className={control}>
        <option value="">{any}</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}

export default async function SearchPage({ searchParams }: PageProps<"/buscar">) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/entrar?next=/buscar");

  const { game } = await currentGame();
  const catalog = await loadCatalog(supabase, game.id);
  const raw = await searchParams;
  const filters = parseFilters(raw, catalog);

  // URL canónica: sin parámetros vacíos ni valores desconocidos (compartible y estable).
  const current = new URLSearchParams(
    Object.entries(raw).flatMap(([k, v]) => (Array.isArray(v) ? v : [v ?? ""]).map((x) => [k, x])),
  ).toString();
  if (current !== toSearchParams(filters).toString()) redirect(href(filters));
  // Quién está disponible ahora (para el filtro y para marcarlo en las tarjetas).
  const { data: availableRows } = await supabase.rpc("available_now", { p_game: game.id });
  const available = new Map((availableRows ?? []).map((a) => [a.user_id, a]));
  const { players, total } = await searchPlayers(
    supabase,
    userId,
    toConditions(filters, catalog),
    filters.page,
    game.id,
    filters.now ? [...available.keys()] : undefined,
  );
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const n = activeCount(filters);
  const advanced = advancedCount(filters);
  // Etiqueta en singular del filtro de personaje (Agente, Leyenda…); null si el juego no tiene personajes.
  const character =
    game.character_label && catalog.characters.length > 0 ? game.character_label.replace(/s$/, "") : null;
  const ranks = catalog.ranks.map((r) => [r.slug, r.name] as [string, string]);
  const [t, to, locale] = await Promise.all([getTranslations("search"), getTranslations("options"), getLocale()]);
  const opts = (group: "languages" | "goals" | "voice", o: Record<string, string>) =>
    optionKeys(o).map((k) => [k, to(`${group}.${k}` as never)] as [string, string]);
  const any = t("any");

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">{t("title")}</h1>
        <p className="text-muted">
          {game.name} · {t("lead")}
        </p>
      </div>

      <details open={n === 0} className="surface p-4">
        <summary className="min-h-11 cursor-pointer py-2 font-semibold">{t("filters")}{n ? ` (${n})` : ""}</summary>
        <form method="get" action="/buscar" className="mt-3 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Select name="rmin" label={t("rankMin")} value={filters.rmin} options={ranks} any={t("noMin")} />
          <Select name="rmax" label={t("rankMax")} value={filters.rmax} options={ranks} any={t("noMax")} />
          <Select name="region" label={t("region")} value={filters.region} options={catalog.regions.map((r) => [r.slug, r.name])} any={any} />
          <Select name="mode" label={t("mode")} value={filters.mode} options={catalog.modes.map((m) => [m.slug, m.name])} any={any} />
          <Select name="role" label={t("role")} value={filters.role} options={catalog.roles.map((r) => [r.slug, r.name])} any={any} />
          <label className="col-span-2 flex min-h-11 items-center gap-2 self-end rounded-md border border-line px-3 text-sm has-[:checked]:border-accent sm:col-span-1">
            <input type="checkbox" name="now" value="1" defaultChecked={filters.now} className="size-4 accent-accent" />
            {t("onlyNow")}
          </label>
          {/* Ley de Hick: a la vista solo los filtros principales; el resto, plegado (abierto si alguno está activo). */}
          <details open={advanced > 0} className="col-span-2 lg:col-span-4">
            <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-accent-soft">
              {t("moreFilters")}{advanced ? ` (${advanced})` : ""}
            </summary>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {character && (
          <>
          <Select name="agent" label={character} value={filters.agent} options={catalog.characters.map((c) => [c.slug, c.name])} any={any} />
          <fieldset className="col-span-2 text-sm">
            <legend className="font-medium">{t("howPlayed")}</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {optionKeys(CHARACTER_STATUS).map((k) => (
                <label key={k} className="flex min-h-11 items-center gap-2 rounded-md border border-line px-3 has-[:checked]:border-accent">
                  <input type="checkbox" name="astatus" value={k} defaultChecked={filters.astatus?.includes(k as never)} className="size-4 accent-accent" />
                  {to(`characterStatus.${k}`)}
                </label>
              ))}
            </div>
          </fieldset>
          </>
          )}
          <Select name="lang" label={t("language")} value={filters.lang} options={opts("languages", LANGUAGES)} any={any} />
          <Select name="goal" label={t("goal")} value={filters.goal} options={opts("goals", GOALS)} any={any} />
          <Select name="voice" label={t("voice")} value={filters.voice} options={opts("voice", VOICE)} any={any} />
          <label className="col-span-2 flex min-h-11 items-center gap-2 self-end rounded-md border border-line px-3 text-sm has-[:checked]:border-accent sm:col-span-1">
            <input type="checkbox" name="flex" value="1" defaultChecked={filters.flex} className="size-4 accent-accent" />
            {t("onlyFlex")}
          </label>
          <fieldset className="col-span-2 text-sm lg:col-span-4">
            <legend className="font-medium">{t("schedule")}</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {optionKeys(AVAILABILITY).map((k) => (
                <label key={k} className="flex min-h-11 items-center gap-2 rounded-md border border-line px-3 has-[:checked]:border-accent">
                  <input type="checkbox" name="slot" value={k} defaultChecked={filters.slot.includes(k as never)} className="size-4 accent-accent" />
                  {to(`availability.${k}`)}
                </label>
              ))}
            </div>
          </fieldset>
            </div>
          </details>
          <div className="col-span-2 flex flex-wrap items-center gap-3 lg:col-span-4">
            <button type="submit" className="btn-primary">
              {t("submit")}
            </button>
            {n > 0 && (
              <Link href="/buscar" className="min-h-11 py-3 text-sm text-accent-soft underline underline-offset-4">
                {t("clear")}
              </Link>
            )}
          </div>
        </form>
      </details>

      <p role="status" className="text-sm text-muted">
        {t("total", { count: total })}
        {pages > 1 ? ` · ${t("page", { page: filters.page, pages })}` : ""}
      </p>

      {players.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {players.map((p, i) => (
            <PlayerCard
              key={p.user_id}
              p={p}
              index={i}
              catalog={catalog}
              characterLabel={game.character_label}
              available={available.get(p.user_id!) ?? null}
            />
          ))}
        </ul>
      ) : (
        <div className="rounded-lg border border-dashed border-line p-6 text-center">
          <h2 className="font-semibold">{n > 0 ? t("emptyFiltered") : t("empty")}</h2>
          {n > 0 ? (
            <>
              <p className="mt-1 text-sm text-muted">{t("widenHint")}</p>
              <ul className="mt-3 flex flex-wrap justify-center gap-2">
                {widenSuggestions(filters, locale).map((s) => (
                  <li key={s.label}>
                    <Link href={href(s.filters)} className="btn-ghost">
                      {s.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted">
              {t("emptyText", { game: game.name })}
            </p>
          )}
        </div>
      )}

      {pages > 1 && (
        <nav aria-label={t("pagination")} className="flex items-center justify-center gap-3">
          {filters.page > 1 && (
            <Link href={href({ ...filters, page: filters.page - 1 })} className="btn-ghost">
              {t("prev")}
            </Link>
          )}
          {filters.page < pages && (
            <Link href={href({ ...filters, page: filters.page + 1 })} className="btn-ghost">
              {t("next")}
            </Link>
          )}
        </nav>
      )}
    </section>
  );
}
