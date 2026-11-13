import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { formatStart } from "@/lib/lobbies/format";
import { sharedExtras, sharedSummary } from "@/lib/shared-lobby";
import { loadSharedLobby } from "@/lib/shared-lobby-query";

// Página pública de un grupo compartido (Discord, WhatsApp…). Solo el resumen; para unirse hay que entrar.
export async function generateMetadata({ params }: PageProps<"/unete/[id]">): Promise<Metadata> {
  const { id } = await params;
  const [l, locale, t] = await Promise.all([loadSharedLobby(id), getLocale(), getTranslations("shared")]);
  if (!l) return { title: t("unavailable"), robots: { index: false } };
  const title = `${t("modeOf", { mode: l.mode_name, game: l.game_name })}${l.roles.length ? ` · ${t("looking", { roles: l.roles.join(", ") })}` : ""}`;
  return {
    title,
    description: t("joinOn", { summary: sharedSummary(l, locale) }),
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description: sharedSummary(l, locale),
      images: [{ url: `/unete/${id}/opengraph-image`, alt: t("ogAlt"), width: 1200, height: 630, type: "image/png" }],
    },
  };
}

export default async function SharedLobbyPage({ params }: PageProps<"/unete/[id]">) {
  const { id } = await params;
  const [l, locale, t] = await Promise.all([loadSharedLobby(id), getLocale(), getTranslations("shared")]);
  if (!l) notFound();
  const free = Math.max(0, l.slots - l.taken);
  const open = l.status === "open";

  return (
    <article className="mx-auto flex max-w-xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="kicker">{l.game_name}</p>
        <h1 className="font-display text-3xl font-semibold">{l.mode_name}</h1>
        <p className="text-muted">{t("groupOf", { owner: l.owner_name ?? t("aPlayer") })}</p>
      </header>
      <section className="surface hud flex flex-col gap-3 p-5">
        <p className="font-display text-xl font-semibold">
          {open ? t("freeOf", { count: free, slots: l.slots }) : l.status === "full" ? t("groupFull") : t("groupClosed")}
        </p>
        <dl className="grid gap-1 text-sm">
          <div className="flex gap-2">
            <dt className="text-muted">{t("lookingLabel")}</dt>
            <dd>{l.roles.length ? l.roles.join(" · ") : t("anyRole")}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted">{t("rankLabel")}</dt>
            <dd>{l.rank_min || l.rank_max ? t("rankRange", { min: l.rank_min ?? "—", max: l.rank_max ?? "—" }) : t("anyRank")}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted">{t("whenLabel")}</dt>
            <dd>{formatStart(l.starts_at, locale)}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted">{t("moreLabel")}</dt>
            <dd>{sharedExtras(l, locale).join(" · ") || "—"}</dd>
          </div>
        </dl>
        {l.note && <p className="text-sm">«{l.note}»</p>}
      </section>
      {open ? (
        <Link href={`/grupos/${l.id}`} className="btn-primary self-start">
          {t("join")}
        </Link>
      ) : (
        <Link href="/grupos" className="btn-ghost self-start">
          {t("others")}
        </Link>
      )}
      <p className="text-xs text-muted">{t("rankNote")}</p>
    </article>
  );
}
