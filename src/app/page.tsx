import { HeartHandshake, MessagesSquare, ShieldCheck, SlidersHorizontal, Swords, UsersRound } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { redirect } from "next/navigation";
import { CharacterIcon } from "@/components/game-icons";
import { currentGame } from "@/lib/games";
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
    Icon: MessagesSquare,
    title: "Salas de grupo en directo",
    text: "Cada grupo tiene su chat, solo para sus miembros, con límites contra el spam.",
  },
] as const;

export default async function Home({ searchParams }: PageProps<"/">) {
  // Supabase devuelve aquí los errores de OAuth (p. ej. estado caducado): llevarlos al login con aviso.
  const sp = await searchParams;
  if (sp.error) redirect("/entrar?error=oauth");
  const deleted = sp.cuenta === "borrada";

  const supabase = await createClient();
  const { game } = await currentGame();
  const [{ data: claims }, { data: agents }] = await Promise.all([
    supabase.auth.getClaims(),
    supabase.from("game_characters").select("id, name, icon_url").eq("game_id", game.id).eq("active", true).order("name"),
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

        {agents && agents.some((a) => a.icon_url) && (
          <ul aria-label={`${game.character_label ?? "Personajes"} disponibles en los perfiles`} className="mt-6 flex max-w-4xl flex-wrap justify-center gap-2">
            {agents.map((a, i) => (
              <li key={a.id} className="enter" style={{ "--i": i } as CSSProperties}>
                <CharacterIcon name={a.name} src={a.icon_url} size={40} decorative={false} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="como" className="flex flex-col gap-8">
        <h2 id="como" className="font-display text-2xl font-semibold sm:text-3xl">
          De la cola en solitario a tu stack
        </h2>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ Icon, title, text }) => (
            <li key={title} className="surface flex flex-col gap-3 p-5">
              <Icon aria-hidden="true" className="size-6 text-muted" />
              <h3 className="font-display text-lg font-semibold">{title}</h3>
              <p className="text-sm text-muted">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="funciones" className="grid gap-4 md:grid-cols-3">
        <h2 id="funciones" className="sr-only">
          Funciones
        </h2>
        {FEATURES.map(({ Icon, title, text }) => (
          <div key={title} className="surface flex flex-col gap-3 p-6">
            <Icon aria-hidden="true" className="size-6 text-muted" />
            <h3 className="font-display text-lg font-semibold">{title}</h3>
            <p className="text-sm text-muted">{text}</p>
          </div>
        ))}
      </section>

      <section className="surface flex flex-col items-center gap-4 px-6 py-12 text-center">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">¿Listo para la próxima partida?</h2>
        <p className="max-w-xl text-muted">{es.home.beta} Entra con Discord y completa tu perfil en un minuto.</p>
        <Link href={cta.href} className="btn-primary">
          {cta.text}
        </Link>
      </section>
    </div>
  );
}
