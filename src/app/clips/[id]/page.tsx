import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { Trophy } from "lucide-react";
import { loadClip, loadEmblems, loadWinners } from "@/lib/clips/queries";
import { createClient } from "@/lib/supabase/server";
import { deleteClip, deleteComment, moderateClip, toggleVote } from "../actions";
import { EmblemButton } from "../emblem-button";
import { ClipPlayer, ClipReportForm, CommentForm } from "../components";

export const metadata: Metadata = { title: "Clip" };

const dateFmt = new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" });

export default async function ClipPage({ params }: PageProps<"/clips/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect(`/entrar?next=/clips/${id}`);
  const [data, emblems, { data: isAdmin }] = await Promise.all([
    loadClip(supabase, userId, id),
    loadEmblems(supabase),
    supabase.rpc("is_admin"),
  ]);
  if (!data) notFound();
  const { clip, comments } = data;
  const own = clip.user_id === userId;
  // Semanas cerradas en las que este clip ganó algún emblema.
  const wins = (await loadWinners(supabase, clip.game_id, 52)).filter((w) => w.clip_id === clip.id && w.closed);
  const weekFmt = new Intl.DateTimeFormat("es", { day: "numeric", month: "long" });
  const category = emblems.find((e) => e.id === clip.emblem_id);

  return (
    <article className="flex max-w-3xl flex-col gap-6">
      <Link href="/clips" className="text-sm text-muted underline underline-offset-4 hover:text-text">
        Volver a los clips
      </Link>
      {clip.hidden && (
        <p role="note" className="rounded-md border border-warning p-3 text-sm">
          Este clip está oculto por moderación: solo lo ves tú{isAdmin ? " y el equipo de moderación" : ""}.
        </p>
      )}
      <ClipPlayer clip={{ provider: clip.provider, videoId: clip.video_id }} title={clip.title} ambient />
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">{clip.title}</h1>
        <p className="text-sm text-muted">
          <Link href={`/jugador/${clip.user_id}`} className="underline underline-offset-4 hover:text-text">
            {clip.author.name}
          </Link>{" "}
          · {category?.name} · {dateFmt.format(new Date(clip.created_at))}
        </p>
      </header>

      {wins.length > 0 && (
        <ul aria-label="Premios" className="flex flex-wrap gap-2">
          {wins.map((w) => (
            <li key={`${w.week_start}-${w.emblem_id}`}>
              <Link href="/clips/ganadores" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-warning px-3 text-sm">
                <Trophy aria-hidden="true" className="size-4 text-warning" />
                Ganador de {emblems.find((e) => e.id === w.emblem_id)?.name} · semana del{" "}
                {weekFmt.format(new Date(`${w.week_start}T12:00:00`))}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section aria-labelledby="emblemas" className="surface flex flex-col gap-3 p-5">
        <h2 id="emblemas" className="font-semibold">
          Emblemas
        </h2>
        {own ? (
          <p className="text-sm text-muted">Es tu clip: los demás le pueden dar emblemas.</p>
        ) : (
          <p className="text-sm text-muted">Da los emblemas que se merezca. Pulsa otra vez para quitarlo.</p>
        )}
        <ul className="flex flex-wrap gap-2">
          {emblems.map((e) => {
            const mine = clip.mine.includes(e.id);
            const n = clip.votes[e.id] ?? 0;
            return (
              <li key={e.id}>
                <form action={toggleVote}>
                  <input type="hidden" name="clip" value={clip.id} />
                  <input type="hidden" name="emblem" value={e.id} />
                  <EmblemButton name={e.name} description={e.description} count={n} mine={mine} disabled={own} />
                </form>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="comentarios" className="flex flex-col gap-4">
        <h2 id="comentarios" className="font-semibold">
          Comentarios ({comments.filter((c) => !c.hidden).length})
        </h2>
        {comments.length === 0 && <p className="text-sm text-muted">Nadie ha comentado todavía.</p>}
        <ul className="flex flex-col gap-3">
          {comments.map((c) => (
            <li key={c.id} className={`surface flex flex-col gap-1 p-4 ${c.hidden ? "opacity-70" : ""}`}>
              <p className="text-sm">
                <span className="font-medium">{c.author.name}</span>{" "}
                <span className="text-muted">· {dateFmt.format(new Date(c.created_at))}</span>
                {c.hidden && <span className="text-warning"> · oculto por moderación</span>}
              </p>
              <p className="whitespace-pre-line break-words text-sm">{c.body}</p>
              <div className="flex flex-wrap items-center gap-4">
                {c.user_id === userId ? (
                  <form action={deleteComment}>
                    <input type="hidden" name="clip" value={clip.id} />
                    <input type="hidden" name="comment" value={c.id} />
                    <button type="submit" className="min-h-11 text-sm text-muted hover:text-text">
                      Borrar
                    </button>
                  </form>
                ) : (
                  <ClipReportForm clipId={clip.id} commentId={c.id} label="Denunciar comentario" />
                )}
                {isAdmin && (
                  <form action={moderateClip}>
                    <input type="hidden" name="clip" value={clip.id} />
                    <input type="hidden" name="comment" value={c.id} />
                    <input type="hidden" name="hidden" value={c.hidden ? "0" : "1"} />
                    <button type="submit" className="min-h-11 text-sm text-muted hover:text-text">
                      {c.hidden ? "Mostrar (moderación)" : "Ocultar (moderación)"}
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
        {!clip.hidden && <CommentForm clipId={clip.id} />}
      </section>

      <footer className="flex flex-wrap items-center gap-4 border-t border-line pt-4">
        {own ? (
          <form action={deleteClip}>
            <input type="hidden" name="clip" value={clip.id} />
            <button type="submit" className="min-h-11 rounded-md border border-danger px-4 text-sm text-danger hover:bg-panel-hover">
              Borrar mi clip
            </button>
          </form>
        ) : (
          <ClipReportForm clipId={clip.id} label="Denunciar clip" />
        )}
        {isAdmin && (
          <form action={moderateClip}>
            <input type="hidden" name="clip" value={clip.id} />
            <input type="hidden" name="hidden" value={clip.hidden ? "0" : "1"} />
            <button type="submit" className="min-h-11 text-sm text-muted hover:text-text">
              {clip.hidden ? "Mostrar clip (moderación)" : "Ocultar clip (moderación)"}
            </button>
          </form>
        )}
      </footer>
    </article>
  );
}
