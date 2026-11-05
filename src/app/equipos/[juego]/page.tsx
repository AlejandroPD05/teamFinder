import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CharacterIcon, RoleIcon } from "@/components/game-icons";
import { loadGames, themeStyle } from "@/lib/games";
import { loadCatalog } from "@/lib/profile/queries";
import { createClient } from "@/lib/supabase/server";

// Página pública por juego, pensada para buscadores («equipo para VALORANT», «compañeros para Apex»…).
// Solo muestra el catálogo del juego (datos de configuración), nunca datos de jugadores.

async function gameOf(id: string) {
  return (await loadGames()).find((g) => g.id === id) ?? null;
}

export async function generateMetadata({ params }: PageProps<"/equipos/[juego]">): Promise<Metadata> {
  const game = await gameOf((await params).juego);
  if (!game) return {};
  const title = `Buscar equipo para ${game.name}: compañeros y grupos`;
  const description = `Encuentra jugadores y equipos para ${game.name}. Filtra por rango, rol, idioma y horario, y únete a grupos para jugar en dúo, trío o equipo completo. Gratis.`;
  return {
    title,
    description,
    alternates: { canonical: `/equipos/${game.id}` },
    openGraph: { title, description, url: `/equipos/${game.id}` },
  };
}

export default async function GameTeamsPage({ params }: PageProps<"/equipos/[juego]">) {
  const game = await gameOf((await params).juego);
  if (!game) notFound();
  const supabase = await createClient();
  const [catalog, games, { data: claims }] = await Promise.all([
    loadCatalog(supabase, game.id),
    loadGames(),
    supabase.auth.getClaims(),
  ]);
  const signedIn = Boolean(claims?.claims?.sub);
  const first = catalog.ranks[0]?.name;
  const last = catalog.ranks.at(-1)?.name;
  const characters = game.character_label?.toLowerCase();
  const others = games.filter((g) => g.id !== game.id);

  return (
    <article className="flex flex-col gap-12" style={themeStyle(game)}>
      <header className="flex flex-col gap-4">
        <h1 className="font-display max-w-3xl text-4xl font-bold leading-[1.1] sm:text-5xl">Encuentra equipo para {game.name}</h1>
        <p className="max-w-2xl text-lg text-muted">
          Busca compañeros con tu rango, tus horarios y tu idioma, o únete a un grupo que ya tenga hueco. Cada jugador indica
          sus roles{characters ? `, sus ${characters}` : ""} y cómo se comunica, así sabes con quién vas a jugar antes de entrar.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href={signedIn ? "/buscar" : `/entrar?next=${encodeURIComponent("/buscar")}`} className="btn-primary">
            {signedIn ? "Buscar jugadores" : "Entrar con Discord"}
          </Link>
          <Link href={signedIn ? "/grupos" : "/demo"} className="btn-ghost">
            {signedIn ? "Ver grupos abiertos" : "Ver la demo sin cuenta"}
          </Link>
        </div>
      </header>

      <section aria-labelledby="como" className="grid gap-4 md:grid-cols-2">
        <h2 id="como" className="sr-only">
          Qué puedes filtrar
        </h2>
        <div className="surface flex flex-col gap-3 p-5">
          <h3 className="font-display text-lg font-semibold">Roles</h3>
          <ul className="flex flex-wrap gap-x-4 gap-y-2">
            {catalog.roles.map((r) => (
              <li key={r.id} className="chip">
                <RoleIcon slug={r.slug} className="size-4 text-muted" />
                {r.name}
              </li>
            ))}
          </ul>
        </div>
        <div className="surface flex flex-col gap-3 p-5">
          <h3 className="font-display text-lg font-semibold">Modos</h3>
          <p className="text-sm">{catalog.modes.map((m) => `${m.name} (${m.party_size} jugadores)`).join(" · ")}</p>
        </div>
        <div className="surface flex flex-col gap-3 p-5">
          <h3 className="font-display text-lg font-semibold">Rangos</h3>
          <p className="text-sm">
            {first && last ? `De ${first} a ${last}.` : "Sin rangos configurados."} Cada jugador indica su rango; no lo
            verificamos con el juego.
          </p>
        </div>
        <div className="surface flex flex-col gap-3 p-5">
          <h3 className="font-display text-lg font-semibold">Servidores</h3>
          <p className="text-sm">{catalog.regions.map((r) => r.name).join(" · ")}</p>
        </div>
      </section>

      {catalog.characters.some((c) => c.icon_url) && (
        <section aria-labelledby="personajes" className="flex flex-col gap-4">
          <h2 id="personajes" className="font-display text-2xl font-semibold">
            {game.character_label} de {game.name}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {catalog.characters.map((c, i) => (
              <li key={c.id} className="enter" style={{ "--i": i } as React.CSSProperties}>
                <CharacterIcon name={c.name} src={c.icon_url} size={40} decorative={false} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {others.length > 0 && (
        <nav aria-label="Otros juegos" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {others.map((g) => (
            <Link key={g.id} href={`/equipos/${g.id}`} className="text-muted underline underline-offset-4 hover:text-text">
              Equipo para {g.name}
            </Link>
          ))}
        </nav>
      )}
    </article>
  );
}
