import { Gamepad2, HeartHandshake, MessagesSquare, ShieldCheck, SlidersHorizontal, Swords, UsersRound } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GamePicker } from "./game-switcher";
import { currentGame } from "@/lib/games";
import { APP_NAME } from "@/lib/config";
import { siteUrl } from "@/lib/supabase/env";
import { es } from "@/lib/i18n/es";
import { createClient } from "@/lib/supabase/server";

const STEPS = [
  { Icon: Swords, title: "Elige modo", text: "Dúo, trío o equipo completo, ahora o a una hora concreta." },
  { Icon: SlidersHorizontal, title: "Encuentra a tu gente", text: "Filtra por rango, rol, personaje, idioma y horario." },
  { Icon: MessagesSquare, title: "Coordinaos", text: "Solicita unirte y habla en la sala del grupo en tiempo real." },
  { Icon: HeartHandshake, title: "Jugad y reconoced", text: "Al cerrar el grupo, reconoce a los compañeros que lo hicieron bien." },
] as const;

const FEATURES = [
  {
    Icon: UsersRound,
    title: "Perfiles que dicen cómo juegas",
    text: "Roles, pool de personajes con main y comfort picks, modos, idiomas y horarios.",
  },
  {
    Icon: ShieldCheck,
    title: "Tu privacidad, campo a campo",
    text: "Decides qué ve todo el mundo, solo la comunidad o solo tú. Bloquea y denuncia cuando haga falta.",
  },
  {
    Icon: Gamepad2,
    title: "Un perfil por juego",
    text: "VALORANT, Counter-Strike 2 y Apex Legends, cada uno con sus rangos, roles y personajes. Cambia de juego desde la portada.",
  },
] as const;

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function Home({ searchParams }: PageProps<"/">) {
  // Supabase devuelve aquí los errores de OAuth (p. ej. estado caducado): llevarlos al login con aviso.
  const sp = await searchParams;
  if (sp.error) redirect("/entrar?error=oauth");
  const deleted = sp.cuenta === "borrada";

  const supabase = await createClient();
  const { game, games } = await currentGame();
  const [{ data: claims }, { data: counts }] = await Promise.all([
    supabase.auth.getClaims(),
    supabase.rpc("game_player_counts"),
  ]);
  const signedIn = Boolean(claims?.claims?.sub);
  const cta = signedIn ? { href: "/buscar", text: es.home.ctaSignedIn } : { href: "/entrar", text: es.home.cta };

  return (
    <div className="flex flex-col gap-20 sm:gap-28">
      {deleted && (
        <p role="status" className="rounded-md border border-success bg-panel p-3 text-sm text-success">
          Tu cuenta y tus datos se han borrado.
        </p>
      )}

      <section className="relative flex flex-col items-center gap-7 pt-6 text-center sm:pt-14">
        <h1 className="font-display max-w-3xl text-4xl font-bold leading-[1.1] sm:text-6xl">
          Encuentra con quién hacer stack en {game.name}
        </h1>
        <p className="max-w-2xl text-lg text-muted">{es.home.lead}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href={cta.href} className="btn-primary">
            {cta.text}
          </Link>
          <Link href={signedIn ? "/grupos" : "/demo"} className="btn-ghost">
            {signedIn ? "Ver grupos abiertos" : "Ver la demo sin cuenta"}
          </Link>
        </div>

        <div className="mt-4 flex w-full justify-center">
          <GamePicker
            games={games}
            current={game.id}
            counts={Object.fromEntries((counts ?? []).map((c) => [c.game_id, c.players]))}
          />
        </div>
      </section>

      <script
        type="application/ld+json"
        // Datos estructurados para buscadores: el sitio y lo que ofrece.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: APP_NAME,
            url: siteUrl(),
            inLanguage: "es",
            description: es.meta.description,
          }),
        }}
      />

      <nav aria-labelledby="juegos" className="flex flex-col gap-4">
        <h2 id="juegos" className="font-display text-2xl font-semibold sm:text-3xl">
          Busca equipo por juego
        </h2>
        <ul className="grid gap-4 sm:grid-cols-3">
          {games.map((g) => (
            <li key={g.id}>
              <Link href={`/equipos/${g.id}`} className="surface surface-interactive flex min-h-11 flex-col gap-1 p-5">
                <span className="font-display text-lg font-semibold">Equipo para {g.name}</span>
                <span className="text-sm text-muted">Roles, rangos, modos y servidores</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section aria-labelledby="como" className="flex flex-col gap-10">
        <h2 id="como" className="font-display text-2xl font-semibold sm:text-3xl">
          De la cola en solitario a tu stack
        </h2>
        {/* Pasos: un recorrido, no tarjetas. El orden lo da la lista. */}
        <ol className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ Icon, title, text }, i) => (
            <li key={title} className="flex flex-col gap-2 border-t border-line pt-5">
              <span className="flex items-center gap-3">
                <span aria-hidden="true" className="kicker tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <Icon aria-hidden="true" className="size-5 text-accent-soft" />
              </span>
              <h3 className="font-display text-lg font-semibold">{title}</h3>
              <p className="text-sm text-muted">{text}</p>
            </li>
          ))}
        </ol>

        <h3 id="funciones" className="sr-only">
          Qué incluye
        </h3>
        <ul aria-labelledby="funciones" className="mt-4 grid gap-4 md:grid-cols-3">
          {FEATURES.map(({ Icon, title, text }) => (
            <li key={title} className="surface flex flex-col gap-3 p-6">
              <Icon aria-hidden="true" className="size-6 text-accent-soft" />
              <h4 className="font-display text-lg font-semibold">{title}</h4>
              <p className="text-sm text-muted">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="surface hud flex flex-col items-center gap-4 px-6 py-12 text-center">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">¿Listo para la próxima partida?</h2>
        <p className="max-w-xl text-muted">{es.home.beta} Entra con Discord y completa tu perfil en un minuto.</p>
        <Link href={cta.href} className="btn-primary">
          {cta.text}
        </Link>
      </section>
    </div>
  );
}
