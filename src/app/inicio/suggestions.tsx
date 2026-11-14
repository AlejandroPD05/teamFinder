import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { fitReasons } from "@/lib/fit";
import type { Catalog } from "@/lib/profile/queries";
import { searchPlayers } from "@/lib/search/query";
import type { createClient } from "@/lib/supabase/server";
import { PlayerCard } from "../buscar/player-card";

type Client = Awaited<ReturnType<typeof createClient>>;

/** Jugadores que te pueden encajar, con el motivo de cada uno (rol que te falta, servidor, horario, rango, idioma). */
export async function Suggestions({
  supabase,
  userId,
  gameId,
  catalog,
  characterLabel,
}: {
  supabase: Client;
  userId: string;
  gameId: string;
  catalog: Catalog;
  characterLabel: string | null;
}) {
  const t = await getTranslations("fit");
  const { data } = await supabase.rpc("suggested_players", { p_game: gameId, p_limit: 3 });
  const rows = data ?? [];
  // Las tarjetas salen de la vista de búsqueda (con la privacidad ya aplicada), en el orden de la sugerencia.
  const { players } = rows.length
    ? await searchPlayers(supabase, userId, [], 1, gameId, rows.map((r) => r.user_id))
    : { players: [] };
  const byId = new Map(players.map((p) => [p.user_id, p]));
  const list = rows.flatMap((r) => {
    const p = byId.get(r.user_id);
    return p ? [{ p, reasons: fitReasons(r.reasons), available: r.available }] : [];
  });

  return (
    <section aria-labelledby="encajan" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="encajan" className="font-display text-xl font-semibold">
            {t("title")}
          </h2>
          <p className="text-sm text-muted">{t("lead")}</p>
        </div>
        <Link href="/buscar" className="btn-ghost">
          {t("more")}
        </Link>
      </div>
      {list.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map(({ p, reasons }, i) => (
            <PlayerCard key={p.user_id} p={p} index={i} catalog={catalog} characterLabel={characterLabel} reasons={reasons} />
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-line p-4 text-sm text-muted">{t("empty")}</p>
      )}
    </section>
  );
}
