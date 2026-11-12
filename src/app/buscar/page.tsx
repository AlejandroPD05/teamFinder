import { currentGame } from "@/lib/games";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AVAILABILITY, CHARACTER_STATUS, GOALS, LANGUAGES, VOICE } from "@/lib/profile/options";
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

export const metadata: Metadata = { title: "Buscar jugadores" };

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
  any = "Cualquiera",
}: {
  name: string;
  label: string;
  value?: string;
  options: [string, string][];
  any?: string;
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
  const { players, total } = await searchPlayers(supabase, userId, toConditions(filters, catalog), filters.page, game.id);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const n = activeCount(filters);
  const advanced = advancedCount(filters);
  // Etiqueta en singular del filtro de personaje (Agente, Leyenda…); null si el juego no tiene personajes.
  const character =
    game.character_label && catalog.characters.length > 0 ? game.character_label.replace(/s$/, "") : null;
  const ranks = catalog.ranks.map((r) => [r.slug, r.name] as [string, string]);

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Buscar jugadores</h1>
        <p className="text-muted">
          {game.name} · Solo ves lo que cada jugador ha decidido mostrar. Los rangos son introducidos por cada jugador.
        </p>
      </div>

      <details open={n === 0} className="surface p-4">
        <summary className="min-h-11 cursor-pointer py-2 font-semibold">Filtros{n ? ` (${n})` : ""}</summary>
        <form method="get" action="/buscar" className="mt-3 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Select name="rmin" label="Rango mínimo" value={filters.rmin} options={ranks} any="Sin mínimo" />
          <Select name="rmax" label="Rango máximo" value={filters.rmax} options={ranks} any="Sin máximo" />
          <Select name="region" label="Servidor" value={filters.region} options={catalog.regions.map((r) => [r.slug, r.name])} />
          <Select name="mode" label="Modo" value={filters.mode} options={catalog.modes.map((m) => [m.slug, m.name])} />
          <Select name="role" label="Rol" value={filters.role} options={catalog.roles.map((r) => [r.slug, r.name])} />
          {/* Ley de Hick: a la vista solo los filtros principales; el resto, plegado (abierto si alguno está activo). */}
          <details open={advanced > 0} className="col-span-2 lg:col-span-4">
            <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-accent-soft">
              Más filtros{advanced ? ` (${advanced})` : ""}
            </summary>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {character && (
          <>
          <Select name="agent" label={character} value={filters.agent} options={catalog.characters.map((c) => [c.slug, c.name])} />
          <fieldset className="col-span-2 text-sm">
            <legend className="font-medium">Cómo lo juega</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {Object.entries(CHARACTER_STATUS).map(([k, v]) => (
                <label key={k} className="flex min-h-11 items-center gap-2 rounded-md border border-line px-3 has-[:checked]:border-accent">
                  <input type="checkbox" name="astatus" value={k} defaultChecked={filters.astatus?.includes(k as never)} className="size-4 accent-accent" />
                  {v}
                </label>
              ))}
            </div>
          </fieldset>
          </>
          )}
          <Select name="lang" label="Idioma" value={filters.lang} options={Object.entries(LANGUAGES)} />
          <Select name="goal" label="Objetivo" value={filters.goal} options={Object.entries(GOALS)} />
          <Select name="voice" label="Comunicación" value={filters.voice} options={Object.entries(VOICE)} />
          <label className="col-span-2 flex min-h-11 items-center gap-2 self-end rounded-md border border-line px-3 text-sm has-[:checked]:border-accent sm:col-span-1">
            <input type="checkbox" name="flex" value="1" defaultChecked={filters.flex} className="size-4 accent-accent" />
            Solo jugadores Flex
          </label>
          <fieldset className="col-span-2 text-sm lg:col-span-4">
            <legend className="font-medium">Horario (cualquiera de los marcados)</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {Object.entries(AVAILABILITY).map(([k, v]) => (
                <label key={k} className="flex min-h-11 items-center gap-2 rounded-md border border-line px-3 has-[:checked]:border-accent">
                  <input type="checkbox" name="slot" value={k} defaultChecked={filters.slot.includes(k as never)} className="size-4 accent-accent" />
                  {v}
                </label>
              ))}
            </div>
          </fieldset>
            </div>
          </details>
          <div className="col-span-2 flex flex-wrap items-center gap-3 lg:col-span-4">
            <button type="submit" className="btn-primary">
              Buscar
            </button>
            {n > 0 && (
              <Link href="/buscar" className="min-h-11 py-3 text-sm text-accent-soft underline underline-offset-4">
                Quitar filtros
              </Link>
            )}
          </div>
        </form>
      </details>

      <p role="status" className="text-sm text-muted">
        {total === 1 ? "1 jugador" : `${total} jugadores`}
        {pages > 1 ? ` · página ${filters.page} de ${pages}` : ""}
      </p>

      {players.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {players.map((p, i) => (
            <PlayerCard key={p.user_id} p={p} index={i} catalog={catalog} characterLabel={game.character_label} />
          ))}
        </ul>
      ) : (
        <div className="rounded-lg border border-dashed border-line p-6 text-center">
          <h2 className="font-semibold">{n > 0 ? "No hay jugadores con estos filtros" : "Aún no hay otros jugadores"}</h2>
          {n > 0 ? (
            <>
              <p className="mt-1 text-sm text-muted">Prueba a ampliar la búsqueda:</p>
              <ul className="mt-3 flex flex-wrap justify-center gap-2">
                {widenSuggestions(filters).map((s) => (
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
              Todavía no hay otros jugadores con perfil de {game.name} visible. Completa el tuyo para que te encuentren.
            </p>
          )}
        </div>
      )}

      {pages > 1 && (
        <nav aria-label="Paginación" className="flex items-center justify-center gap-3">
          {filters.page > 1 && (
            <Link href={href({ ...filters, page: filters.page - 1 })} className="btn-ghost">
              Anterior
            </Link>
          )}
          {filters.page < pages && (
            <Link href={href({ ...filters, page: filters.page + 1 })} className="btn-ghost">
              Siguiente
            </Link>
          )}
        </nav>
      )}
    </section>
  );
}
