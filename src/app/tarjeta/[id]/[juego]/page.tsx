import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { loadPlayerCard } from "@/lib/player-card-query";

// Tarjeta pública de un jugador, solo si la ha activado. Fuera de buscadores: es de una persona.
export async function generateMetadata({ params }: PageProps<"/tarjeta/[id]/[juego]">): Promise<Metadata> {
  const { id, juego } = await params;
  const [c, t] = await Promise.all([loadPlayerCard(id, juego), getTranslations("playerShare")]);
  if (!c) return { title: t("unavailable"), robots: { index: false, follow: false } };
  const title = t("pageTitle", { name: c.display_name, game: c.game_name });
  const description = [c.primary_role ?? c.roles[0], c.rank_name, c.region].filter(Boolean).join(" · ");
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      images: [{ url: `/tarjeta/${id}/${juego}/opengraph-image`, alt: t("ogAlt", { name: c.display_name }), width: 1200, height: 630, type: "image/png" }],
    },
  };
}

export default async function PlayerCardPage({ params }: PageProps<"/tarjeta/[id]/[juego]">) {
  const { id, juego } = await params;
  const [c, t] = await Promise.all([loadPlayerCard(id, juego), getTranslations("playerShare")]);
  if (!c) notFound();
  return (
    <article className="mx-auto flex max-w-xl flex-col gap-6">
      <header className="flex items-center gap-4">
        {c.avatar_url ? (
          <Image src={c.avatar_url} alt="" width={64} height={64} className="rounded-full" />
        ) : (
          <span aria-hidden="true" className="flex size-16 items-center justify-center rounded-full bg-panel text-2xl font-semibold">
            {c.display_name.charAt(0).toUpperCase()}
          </span>
        )}
        <div>
          <p className="kicker">{c.game_name}</p>
          <h1 className="font-display text-3xl font-semibold">{c.display_name}</h1>
          {c.flex && <span className="text-sm font-medium text-info-soft">Flex</span>}
        </div>
      </header>
      <section className="surface hud p-5">
        <dl className="grid gap-2 text-sm">
          <div className="flex gap-2">
            <dt className="text-muted">{t("rank")}</dt>
            <dd>{c.rank_name ?? t("unset")}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted">{t("roles")}</dt>
            <dd>{c.roles.length ? c.roles.join(" · ") : t("unset")}</dd>
          </div>
          {c.mains.length > 0 && (
            <div className="flex gap-2">
              <dt className="text-muted">{t("mains")}</dt>
              <dd>{c.mains.join(" · ")}</dd>
            </div>
          )}
          {c.region && (
            <div className="flex gap-2">
              <dt className="text-muted">{t("region")}</dt>
              <dd>{c.region}</dd>
            </div>
          )}
        </dl>
      </section>
      <div className="flex flex-wrap gap-3">
        <Link href={`/jugador/${id}`} className="btn-primary">
          {t("viewProfile")}
        </Link>
        <Link href="/" className="btn-ghost">
          {t("discover")}
        </Link>
      </div>
      <p className="text-xs text-muted">{t("rankNote")}</p>
    </article>
  );
}
