import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatStart } from "@/lib/lobbies/format";
import { sharedExtras, sharedSummary } from "@/lib/shared-lobby";
import { loadSharedLobby } from "@/lib/shared-lobby-query";

// Página pública de un grupo compartido (Discord, WhatsApp…). Solo el resumen; para unirse hay que entrar.
export async function generateMetadata({ params }: PageProps<"/unete/[id]">): Promise<Metadata> {
  const l = await loadSharedLobby((await params).id);
  if (!l) return { title: "Grupo no disponible", robots: { index: false } };
  const title = `${l.mode_name} de ${l.game_name}${l.roles.length ? ` · busca ${l.roles.join(", ")}` : ""}`;
  return {
    title,
    description: `${sharedSummary(l)}. Únete en TeamFinder.`,
    robots: { index: false, follow: false },
    openGraph: { title, description: sharedSummary(l) },
  };
}

export default async function SharedLobbyPage({ params }: PageProps<"/unete/[id]">) {
  const { id } = await params;
  const l = await loadSharedLobby(id);
  if (!l) notFound();
  const free = Math.max(0, l.slots - l.taken);
  const open = l.status === "open";

  return (
    <article className="mx-auto flex max-w-xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="kicker">{l.game_name}</p>
        <h1 className="font-display text-3xl font-semibold">{l.mode_name}</h1>
        <p className="text-muted">Grupo de {l.owner_name ?? "un jugador"} en TeamFinder.</p>
      </header>
      <section className="surface hud flex flex-col gap-3 p-5">
        <p className="font-display text-xl font-semibold">
          {open ? `${free} ${free === 1 ? "plaza libre" : "plazas libres"} de ${l.slots}` : l.status === "full" ? "Grupo completo" : "Grupo cerrado"}
        </p>
        <dl className="grid gap-1 text-sm">
          <div className="flex gap-2">
            <dt className="text-muted">Buscan:</dt>
            <dd>{l.roles.length ? l.roles.join(" · ") : "Cualquier rol"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted">Rango:</dt>
            <dd>{l.rank_min || l.rank_max ? `${l.rank_min ?? "—"} a ${l.rank_max ?? "—"}` : "Cualquiera"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted">Cuándo:</dt>
            <dd>{formatStart(l.starts_at)}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted">Más:</dt>
            <dd>{sharedExtras(l).join(" · ") || "—"}</dd>
          </div>
        </dl>
        {l.note && <p className="text-sm">«{l.note}»</p>}
      </section>
      {open ? (
        <Link href={`/grupos/${l.id}`} className="btn-primary self-start">
          Entrar y pedir unirme
        </Link>
      ) : (
        <Link href="/grupos" className="btn-ghost self-start">
          Ver otros grupos
        </Link>
      )}
      <p className="text-xs text-muted">El rango lo indica cada jugador: no está verificado con el juego.</p>
    </article>
  );
}
