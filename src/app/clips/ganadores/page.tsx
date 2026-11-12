import { Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { loadEmblems, loadWinners, type Winner } from "@/lib/clips/queries";
import { currentGame } from "@/lib/games";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Ganadores de clips" };

const weekFmt = new Intl.DateTimeFormat("es", { day: "numeric", month: "long" });

/** «Semana del 3 al 9 de noviembre». */
function weekLabel(start: string) {
  const a = new Date(`${start}T12:00:00`);
  const b = new Date(a.getTime() + 6 * 86_400_000);
  return `Semana del ${weekFmt.format(a)} al ${weekFmt.format(b)}`;
}

export default async function WinnersPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/entrar?next=/clips/ganadores");
  const { game } = await currentGame();
  const [winners, emblems] = await Promise.all([loadWinners(supabase, game.id, 12), loadEmblems(supabase)]);
  const weeks = [...new Set(winners.map((w) => w.week_start))];

  return (
    <section className="flex max-w-3xl flex-col gap-8">
      <Link href="/clips" className="text-sm text-muted underline underline-offset-4 hover:text-text">
        Volver a los clips
      </Link>
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-semibold">Ganadores de clips de {game.name}</h1>
        <p className="text-muted">Cada semana, el mejor clip de cada emblema. Son reconocimientos de la comunidad, sin premios.</p>
      </header>

      <details className="surface p-5 text-sm">
        <summary className="min-h-11 cursor-pointer py-2 font-medium">Cómo se elige</summary>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-muted">
          <li>La semana va de lunes a domingo (hora de España).</li>
          <li>Por cada emblema gana el clip publicado esa semana que más emblemas de ese tipo recibe en esa misma semana.</li>
          <li>Solo cuentan los emblemas de cuentas con más de un día de antigüedad, y nadie puede dárselos a sus propios clips.</li>
          <li>Hacen falta al menos 3 emblemas. Si hay empate, gana el clip publicado antes.</li>
          <li>Los clips ocultos por moderación no ganan. La semana en curso puede cambiar hasta el domingo.</li>
          <li>Los lunes anunciamos los ganadores en el Discord de la comunidad: título, nombre visible y enlace al clip.</li>
        </ul>
      </details>

      {weeks.length === 0 ? (
        <p className="surface p-5 text-muted">Todavía no hay ganadores. ¡Publica tus clips y da emblemas a los que te gusten!</p>
      ) : (
        weeks.map((week) => {
          const list = winners.filter((w) => w.week_start === week);
          return (
            <section key={week} aria-labelledby={`w-${week}`} className="flex flex-col gap-3">
              <h2 id={`w-${week}`} className="font-display text-xl font-semibold">
                {weekLabel(week)}
                {!list[0].closed && <span className="ml-2 text-sm font-normal text-muted">(en curso)</span>}
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {list.map((w) => (
                  <WinnerItem key={w.emblem_id} w={w} emblem={emblems.find((e) => e.id === w.emblem_id)?.name ?? ""} />
                ))}
              </ul>
            </section>
          );
        })
      )}
    </section>
  );
}

function WinnerItem({ w, emblem }: { w: Winner; emblem: string }) {
  return (
    <li className="surface flex items-start gap-3 p-4">
      <Trophy aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-warning" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm font-medium">
          {emblem} · {w.votes} emblemas
        </span>
        {w.clip ? (
          <>
            <Link href={`/clips/${w.clip.id}`} className="truncate font-display font-semibold hover:underline hover:underline-offset-4">
              {w.clip.title}
            </Link>
            <span className="text-sm text-muted">de {w.clip.author}</span>
          </>
        ) : (
          <span className="text-sm text-muted">Clip no disponible</span>
        )}
      </div>
    </li>
  );
}
