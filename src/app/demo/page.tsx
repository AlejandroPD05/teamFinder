import { FlaskConical, Lock, MessagesSquare } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { CharacterIcon, RankBadge, RoleIcon } from "@/components/game-icons";
import { loadGames, themeStyle } from "@/lib/games";
import { loadCatalog } from "@/lib/profile/queries";
import type { PlayerRow } from "@/lib/search/query";
import { createClient } from "@/lib/supabase/server";
import { PlayerCard } from "../buscar/player-card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("demo");
  return { title: t("metaTitle"), description: t("metaDescription"), alternates: { canonical: "/demo" } };
}

// Demostración pública: TODOS los jugadores, grupos y mensajes de esta página son ficticios y no existen en la base de datos.
// Sirve para que cualquiera (incluidos revisores de Riot Games) vea el flujo sin crear cuenta. Solo el catálogo es real.
type Demo = { id: string; name: string; rank: string; region: string; roles: string[]; primary: string; agents: [string, string][]; modes: string[]; langs: string[]; goals: string[]; voice: string; flex?: boolean };

/** Hace unas horas (fuera del render para la regla de pureza). */
function hoursAgo(h: number) {
  return new Date(Date.now() - h * 3_600_000).toISOString();
}

const PLAYERS: Demo[] = [
  { id: "demo-1", name: "Nébula", rank: "gold-2", region: "eu", roles: ["controller", "sentinel"], primary: "controller", agents: [["omen", "main"], ["clove", "comfort"], ["killjoy", "playable"]], modes: ["duo", "trio"], langs: ["es"], goals: ["ranked"], voice: "voice" },
  { id: "demo-2", name: "Kairo", rank: "platinum-1", region: "eu", roles: ["duelist"], primary: "duelist", agents: [["jett", "main"], ["raze", "comfort"], ["neon", "playable"]], modes: ["five"], langs: ["es", "en"], goals: ["ranked", "improve"], voice: "voice" },
  { id: "demo-3", name: "Lúa", rank: "silver-3", region: "eu", roles: ["initiator", "controller"], primary: "initiator", agents: [["sova", "main"], ["fade", "comfort"], ["viper", "flexible"]], modes: ["duo"], langs: ["es", "gl"], goals: ["casual", "fun"], voice: "listen", flex: true },
];

export default async function DemoPage() {
  const supabase = await createClient();
  // La demo es siempre de VALORANT (la usan los revisores de Riot): usa su tema aunque se haya elegido otro juego.
  const [catalog, games] = await Promise.all([loadCatalog(supabase), loadGames()]);
  const valorant = games.find((g) => g.id === "valorant");
  const bySlug = <T extends { slug: string; id: string }>(list: T[], slug: string) => list.find((x) => x.slug === slug);
  const [t, to] = await Promise.all([getTranslations("demo"), getTranslations("options.karmaTags")]);
  // Los nombres de la demo llevan delante «Ficticio ·» (o su traducción): nadie debe confundirlos con jugadores reales.
  const fake = (name: string) => t("fake", { name });

  const rows: PlayerRow[] = PLAYERS.map((d) => ({
    user_id: d.id,
    game_id: "valorant",
    display_name: fake(d.name),
    avatar_url: null,
    languages: d.langs,
    availability: ["weekday_evening"],
    goals: d.goals,
    voice: d.voice,
    rank_id: bySlug(catalog.ranks, d.rank)?.id ?? null,
    rank_tier: bySlug(catalog.ranks, d.rank)?.tier ?? null,
    rank_source: "manual",
    region_id: bySlug(catalog.regions, d.region)?.id ?? null,
    flex: d.flex ?? false,
    mode_slugs: d.modes,
    role_ids: d.roles.map((r) => bySlug(catalog.roles, r)?.id).filter(Boolean) as string[],
    primary_role_id: bySlug(catalog.roles, d.primary)?.id ?? null,
    character_ids: d.agents.map(([a]) => bySlug(catalog.characters, a)?.id).filter(Boolean) as string[],
    char_keys: d.agents.map(([a, s]) => `${bySlug(catalog.characters, a)?.id}:${s}`),
    updated_at: hoursAgo(3),
  }));

  const ranks = (slug: string) => catalog.ranks.find((r) => r.slug === slug);
  const agent = (slug: string) => catalog.characters.find((c) => c.slug === slug);
  const role = (slug: string) => catalog.roles.find((r) => r.slug === slug);
  const verifiedRank = ranks("gold-3");

  return (
    <div className="flex flex-col gap-12" style={themeStyle(valorant)}>
      <div
        role="note"
        className="flex flex-wrap items-start gap-3 rounded-xl border border-warning p-4 text-sm"
      >
        <FlaskConical aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-warning" />
        <p>{t.rich("notice", { b: (c) => <strong>{c}</strong> })}</p>
      </div>

      <header className="flex flex-col gap-3">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">{t("title")}</h1>
        <p className="max-w-2xl text-muted">{t("lead")}</p>
      </header>

      <section aria-labelledby="d-buscar" className="flex flex-col gap-4">
        <h2 id="d-buscar" className="font-display text-2xl font-semibold">
          {t("searchTitle")}
        </h2>
        <p className="text-sm text-muted">{t("searchText")}</p>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((p) => (
            <PlayerCard key={p.user_id} p={p} catalog={catalog} profileHref={null} />
          ))}
        </ul>
      </section>

      <section aria-labelledby="d-grupo" className="grid gap-4 lg:grid-cols-2">
        <div className="surface flex flex-col gap-4 p-5">
          <h2 id="d-grupo" className="font-display text-2xl font-semibold">
            {t("joinTitle")}
          </h2>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-lg font-semibold">{t("lobbyTitle", { owner: fake("Nébula") })}</p>
              <p className="text-sm">{t("lobbyNote")}</p>
            </div>
            <span className="text-sm font-medium text-success">{t("lobbyStatus")}</span>
          </div>
          <dl className="grid gap-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <dt className="text-muted">{t("looking")}</dt>
              <dd className="chip">
                <RoleIcon slug="initiator" className="size-3.5 text-muted" />
                {role("initiator")?.name}
              </dd>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <dt className="text-muted">{t("rank")}</dt>
              <dd className="flex items-center gap-2">
                {ranks("gold-1") && <RankBadge name={ranks("gold-1")!.name} src={ranks("gold-1")!.icon_url} manual={false} size={20} />}
                <span className="text-muted">{t("to")}</span>
                {ranks("platinum-3") && <RankBadge name={ranks("platinum-3")!.name} src={ranks("platinum-3")!.icon_url} manual={false} size={20} />}
              </dd>
            </div>
          </dl>
          <p className="text-sm text-muted">{t("joinText")}</p>
          <span className="btn-primary pointer-events-none self-start opacity-80" aria-disabled="true">
            {t("joinButton")}
          </span>
        </div>

        <div className="surface flex flex-col gap-3 p-5">
          <h2 className="font-display flex items-center gap-2 text-2xl font-semibold">
            <MessagesSquare aria-hidden="true" className="size-6 text-info-soft" />{t("roomTitle")}
          </h2>
          <p className="text-sm text-muted">{t("roomText")}</p>
          <ol aria-label={t("roomLabel")} className="flex flex-col gap-2 rounded-md bg-bg p-3 text-sm">
            {[
              [fake("Nébula"), t("chat1"), false],
              [fake("Lúa"), t("chat2"), false],
              [t("you"), t("chat3"), true],
            ].map(([who, text, me]) => (
              <li key={String(text)} className={`flex flex-col ${me ? "items-end" : "items-start"}`}>
                <span className="text-xs text-muted">{who}</span>
                <p className={`max-w-[85%] rounded-lg px-3 py-2 ${me ? "bg-panel-hover" : "bg-bg-raised"}`}>{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="d-perfil" className="grid gap-4 lg:grid-cols-2">
        <div className="surface flex flex-col gap-3 p-5">
          <h2 id="d-perfil" className="font-display text-2xl font-semibold">
            {t("propsTitle")}
          </h2>
          <p className="text-sm text-muted">{t("propsText")}</p>
          <p className="text-sm">
            <strong>{fake("Nébula")}</strong>: {t("propsCount")}
          </p>
          <ul className="flex flex-wrap gap-2">
            {(["buen_companero", "comunicativo", "puntual"] as const).map((k) => (
              <li key={k} className="chip">
                {to(k)}
              </li>
            ))}
          </ul>
        </div>

        <div className="surface flex flex-col gap-3 p-5">
          <h2 className="font-display flex items-center gap-2 text-2xl font-semibold">
            <Lock aria-hidden="true" className="size-5 text-accent-soft" />
            {t("riotTitle")}
          </h2>
          <p className="text-sm text-muted">{t("riotText")}</p>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {verifiedRank && <RankBadge name={verifiedRank.name} src={verifiedRank.icon_url} manual={false} size={28} />}
            <span className="text-sm font-medium text-success">{t("verified")}</span>
            {agent("omen") && <CharacterIcon name="Omen" src={agent("omen")!.icon_url} size={32} decorative={false} />}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/entrar" className="btn-primary">
          {t("tryReal")}
        </Link>
        <Link href="/normas" className="btn-ghost">
          {t("rules")}
        </Link>
      </div>
    </div>
  );
}
