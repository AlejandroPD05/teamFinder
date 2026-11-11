import { MessageSquare } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import { listClips, loadEmblems } from "@/lib/clips/queries";
import { currentGame } from "@/lib/games";
import { createClient } from "@/lib/supabase/server";
import { ClipPlayer } from "./components";
import { EmblemSummary } from "./emblem-summary";

export const metadata: Metadata = { title: "Clips" };

const ago = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
function when(iso: string) {
  const h = Math.round((Date.parse(iso) - Date.now()) / 3_600_000);
  return h > -24 ? ago.format(h, "hour") : ago.format(Math.round(h / 24), "day");
}

export default async function ClipsPage({ searchParams }: PageProps<"/clips">) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/entrar?next=/clips");
  const sp = await searchParams;
  const { game } = await currentGame();
  const emblems = await loadEmblems(supabase);
  const emblem = emblems.find((e) => e.slug === sp.emblema);
  const sort = sp.orden === "top" ? "top" : "recent";
  const clips = await listClips(supabase, userId, { gameId: game.id, emblemId: emblem?.id, sort });
  const href = (q: { emblema?: string; orden?: string }) => {
    const p = new URLSearchParams();
    if (q.emblema) p.set("emblema", q.emblema);
    if (q.orden === "top") p.set("orden", "top");
    const s = p.toString();
    return s ? `/clips?${s}` : "/clips";
  };
  const pill = (active: boolean) =>
    `inline-flex min-h-11 items-center rounded-md px-3 text-sm ${active ? "bg-panel-hover font-medium text-text" : "text-muted hover:text-text"}`;

  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-3xl font-semibold">Clips de {game.name}</h1>
          <p className="max-w-2xl text-muted">
            Comparte tus mejores jugadas y da emblemas a las de los demás. Los vídeos se quedan en YouTube, Twitch o Streamable.
          </p>
        </div>
        <Link href="/clips/nuevo" className="btn-primary">
          Publicar clip
        </Link>
      </header>

      <nav aria-label="Filtrar clips" className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-1">
          <Link href={href({ emblema: emblem?.slug })} aria-current={sort === "recent" ? "page" : undefined} className={pill(sort === "recent")}>
            Recientes
          </Link>
          <Link href={href({ emblema: emblem?.slug, orden: "top" })} aria-current={sort === "top" ? "page" : undefined} className={pill(sort === "top")}>
            Más emblemas (7 días)
          </Link>
        </div>
        <div className="flex flex-wrap gap-1">
          <Link href={href({ orden: sort })} aria-current={!emblem ? "true" : undefined} className={pill(!emblem)}>
            Todas
          </Link>
          {emblems.map((e) => (
            <Link key={e.id} href={href({ emblema: e.slug, orden: sort })} aria-current={emblem?.id === e.id ? "true" : undefined} className={pill(emblem?.id === e.id)}>
              {e.name}
            </Link>
          ))}
        </div>
      </nav>

      {clips.length === 0 ? (
        <div className="surface flex flex-col items-start gap-3 p-6">
          <p className="text-muted">
            {emblem || sort === "top" ? "No hay clips con estos filtros." : `Todavía no hay clips de ${game.name}. ¡Publica el primero!`}
          </p>
          <Link href="/clips/nuevo" className="btn-ghost">
            Publicar clip
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {clips.map((c, i) => (
            <li key={c.id} className="surface enter flex flex-col gap-3 p-4" style={{ "--i": i } as CSSProperties}>
              <ClipPlayer clip={{ provider: c.provider, videoId: c.video_id }} title={c.title} />
              <div className="flex flex-col gap-1">
                <h2 className="font-display text-lg font-semibold">
                  <Link href={`/clips/${c.id}`} className="hover:underline hover:underline-offset-4">
                    {c.title}
                  </Link>
                </h2>
                <p className="text-sm text-muted">
                  {c.author.name} · {emblems.find((e) => e.id === c.emblem_id)?.name} · {when(c.created_at)}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <EmblemSummary clip={c} emblems={emblems} />
                <Link href={`/clips/${c.id}`} className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-text">
                  <MessageSquare aria-hidden="true" className="size-4" />
                  {c.comments} {c.comments === 1 ? "comentario" : "comentarios"}
                  <span className="sr-only"> de «{c.title}»</span>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
