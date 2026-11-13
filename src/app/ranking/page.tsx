import { Crown, Medal, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import { NumberRoll } from "@/components/number-roll";
import { currentGame } from "@/lib/games";
import { loadNames } from "@/lib/lobbies/queries";
import { RANKING_RULES as R, daysLeft, rankTier, TIER_LABEL, weekLabel } from "@/lib/ranking";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Ranking semanal" };

const TIER_ICON = { top1: Crown, podium: Medal, top10: Trophy } as const;

type Row = { pos: number; user_id: string; points: number; recognitions: number; finished: number };

export default async function RankingPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const me = claims?.claims?.sub;
  if (!me) redirect("/entrar?next=/ranking");
  const { game } = await currentGame();

  const [{ data: official }, { data: everyone }, { data: past }, { data: blocks }] = await Promise.all([
    supabase.rpc("weekly_ranking", { p_game: game.id }),
    // Tu progreso aunque aún no entres (mismas reglas, sin el mínimo de grupos).
    supabase.rpc("weekly_ranking", { p_game: game.id, p_min_finished: 1 }),
    supabase
      .from("weekly_rank_awards")
      .select("week_start, user_id, pos, points")
      .eq("game_id", game.id)
      .order("week_start", { ascending: false })
      .order("pos")
      .limit(80),
    supabase.from("user_blocks").select("blocked_id"),
  ]);
  const rows: Row[] = official ?? [];
  const top = rows.slice(0, R.topSize);
  const mine = rows.find((r) => r.user_id === me);
  const progress = (everyone ?? []).find((r: Row) => r.user_id === me);
  const blocked = new Set((blocks ?? []).map((b) => b.blocked_id));
  const weeks = [...new Set((past ?? []).map((a) => a.week_start))].slice(0, 8);
  const names = await loadNames(supabase, [...top.map((r) => r.user_id), ...(past ?? []).map((a) => a.user_id)]);
  const left = daysLeft();

  const who = (id: string) =>
    blocked.has(id) ? { name: "Jugador bloqueado", avatar: null, link: false } : { ...(names.get(id) ?? { name: "Jugador", avatar: null }), link: true };

  return (
    <section className="flex max-w-3xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="kicker">{game.name}</p>
        <h1 className="font-display text-3xl font-semibold">Ranking semanal</h1>
        <p className="text-muted">
          Los diez mejores compañeros de la semana: quienes más juegan grupos hasta el final y más reconocimientos reciben.
          Es un reconocimiento de la comunidad, no un rango oficial ni un rating competitivo.
        </p>
      </header>

      <section aria-labelledby="esta-semana" className="surface hud flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="esta-semana" className="font-display text-xl font-semibold">
            Esta semana
          </h2>
          <span className="text-sm text-muted">
            Provisional · {left === 1 ? "cierra hoy a medianoche" : `cierra en ${left} días`}
          </span>
        </div>

        <p className="rounded-md bg-bg px-3 py-2 text-sm">
          {mine ? (
            <>
              Vas <strong>#{mine.pos}</strong> con <NumberRoll value={mine.points} className="font-semibold" /> puntos.
            </>
          ) : progress ? (
            <>
              Llevas {progress.finished} de {R.minFinished} grupos terminados para entrar en el ranking.
            </>
          ) : (
            <>
              Aún no cuentas esta semana. Termina {R.minFinished} grupos para entrar.{" "}
              <Link href="/grupos" className="underline underline-offset-4">
                Ver grupos
              </Link>
            </>
          )}
        </p>

        {top.length === 0 ? (
          <p className="text-sm text-muted">Todavía nadie ha terminado {R.minFinished} grupos esta semana. ¡Puedes ser el primero!</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {top.map((r, i) => {
              const tier = rankTier(r.pos);
              const Icon = TIER_ICON[tier];
              const p = who(r.user_id);
              return (
                <li
                  key={r.user_id}
                  className={`enter flex items-center gap-3 rounded-lg px-3 py-2 ${r.user_id === me ? "bg-panel-hover ring-1 ring-accent" : "bg-bg"}`}
                  style={{ "--i": i } as CSSProperties}
                >
                  <span className={`w-8 text-center font-display text-lg font-bold tabular-nums ${tier === "top10" ? "text-muted" : "text-accent-soft"}`}>
                    {r.pos}
                  </span>
                  {p.avatar ? (
                    <Image src={p.avatar} alt="" width={32} height={32} className="size-8 rounded-full" />
                  ) : (
                    <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-full bg-panel-hover text-xs font-semibold">
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    {p.link ? (
                      <Link href={`/jugador/${r.user_id}`} className="block truncate font-semibold hover:underline">
                        {p.name}
                      </Link>
                    ) : (
                      <span className="block truncate text-muted">{p.name}</span>
                    )}
                    <span className="block text-xs text-muted">
                      {r.recognitions} {r.recognitions === 1 ? "reconocimiento" : "reconocimientos"} · {r.finished}{" "}
                      {r.finished === 1 ? "grupo" : "grupos"}
                    </span>
                  </span>
                  {tier !== "top10" && <Icon aria-label={TIER_LABEL[tier]} className="size-5 text-accent-soft" />}
                  <span className="text-right font-display font-semibold">
                    <NumberRoll value={r.points} /> <span className="text-xs font-normal text-muted">pts</span>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <details className="surface p-5 text-sm">
        <summary className="min-h-11 cursor-pointer py-2 font-medium">Cómo se calcula</summary>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-muted">
          <li>La semana va de lunes a domingo (hora de España). Hay un ranking por juego.</li>
          <li>
            Puntos = {R.pointsPerRecognition} por cada reconocimiento de karma recibido + {R.pointsPerFinished} por cada grupo
            terminado.
          </li>
          <li>
            Un grupo está terminado cuando se llena y se cierra con todos dentro. Cuenta como mucho uno al día, y solo si los
            demás miembros tienen cuentas de más de un día.
          </li>
          <li>Cada compañero cuenta una vez por semana, aunque te reconozca en varios grupos. Sus cuentas deben tener más de un día.</li>
          <li>Para entrar hay que terminar al menos {R.minFinished} grupos en la semana. Quien haya estado restringido esa semana no entra.</li>
          <li>Empates: gana quien tenga más reconocimientos y, después, quien llegó antes a su puntuación.</li>
          <li>
            El lunes se guarda el Top 10 como insignia permanente en el perfil: {TIER_LABEL.top1}, {TIER_LABEL.podium} (2.º y 3.º)
            y {TIER_LABEL.top10}.
          </li>
        </ul>
      </details>

      <section aria-labelledby="anteriores" className="flex flex-col gap-4">
        <h2 id="anteriores" className="font-display text-xl font-semibold">
          Semanas anteriores
        </h2>
        {weeks.length === 0 ? (
          <p className="text-sm text-muted">Aún no se ha cerrado ninguna semana con ganadores.</p>
        ) : (
          weeks.map((w) => (
            <section key={w} aria-labelledby={`sem-${w}`} className="surface p-4">
              <h3 id={`sem-${w}`} className="font-semibold">
                Semana {weekLabel(w)}
              </h3>
              <ol className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                {(past ?? [])
                  .filter((a) => a.week_start === w)
                  .map((a) => {
                    const p = who(a.user_id);
                    return (
                      <li key={a.user_id} className="flex gap-2">
                        <span className="w-6 text-right tabular-nums text-muted">{a.pos}.</span>
                        {p.link ? (
                          <Link href={`/jugador/${a.user_id}`} className="truncate hover:underline">
                            {p.name}
                          </Link>
                        ) : (
                          <span className="truncate text-muted">{p.name}</span>
                        )}
                        <span className="ml-auto tabular-nums text-muted">{a.points} pts</span>
                      </li>
                    );
                  })}
              </ol>
            </section>
          ))
        )}
      </section>
    </section>
  );
}
