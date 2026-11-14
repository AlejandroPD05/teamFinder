import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { catalogLang } from "@/lib/i18n/locale";
import { notFound } from "next/navigation";
import { CharacterIcon, RoleIcon } from "@/components/game-icons";
import { loadGames, themeStyle } from "@/lib/games";
import { loadCatalog } from "@/lib/profile/queries";
import { createClient } from "@/lib/supabase/server";

// Página pública por juego, pensada para buscadores («equipo para VALORANT», «compañeros para Apex»…).
// Solo muestra el catálogo del juego (datos de configuración), nunca datos de jugadores.

async function gameOf(id: string) {
  return (await loadGames()).find((g) => g.id === id) ?? null;
}

export async function generateMetadata({ params }: PageProps<"/equipos/[juego]">): Promise<Metadata> {
  const game = await gameOf((await params).juego);
  if (!game) return {};
  const t = await getTranslations("gamePage");
  const title = t("metaTitle", { game: game.name });
  const description = t("metaDescription", { game: game.name });
  return {
    title,
    description,
    alternates: { canonical: `/equipos/${game.id}` },
    openGraph: { title, description, url: `/equipos/${game.id}` },
  };
}

export default async function GameTeamsPage({ params }: PageProps<"/equipos/[juego]">) {
  const game = await gameOf((await params).juego);
  if (!game) notFound();
  const supabase = await createClient();
  const [catalog, games, { data: claims }] = await Promise.all([
    loadCatalog(supabase, game.id),
    loadGames(),
    supabase.auth.getClaims(),
  ]);
  const signedIn = Boolean(claims?.claims?.sub);
  const first = catalog.ranks[0]?.name;
  const last = catalog.ranks.at(-1)?.name;
  const characters = game.character_label?.toLowerCase();
  const others = games.filter((g) => g.id !== game.id);
  const [t, th, locale] = await Promise.all([getTranslations("gamePage"), getTranslations("home"), getLocale()]);
  const lang = catalogLang(locale);

  return (
    <article className="flex flex-col gap-12" style={themeStyle(game)}>
      <header className="flex flex-col gap-4">
        <h1 className="font-display max-w-3xl text-4xl font-bold leading-[1.1] sm:text-5xl">{t("title", { game: game.name })}</h1>
        <p className="max-w-2xl text-lg text-muted">
          {characters ? t("leadWithCharacters", { characters }) : t("lead")}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href={signedIn ? "/buscar" : `/entrar?next=${encodeURIComponent("/buscar")}`} className="btn-primary">
            {signedIn ? th("ctaSignedIn") : t("signIn")}
          </Link>
          <Link href={signedIn ? "/grupos" : "/demo"} className="btn-ghost">
            {signedIn ? th("openLobbies") : th("demo")}
          </Link>
        </div>
      </header>

      <section aria-labelledby="como" className="grid gap-4 md:grid-cols-2">
        <h2 id="como" className="sr-only">
          {t("filtersTitle")}
        </h2>
        <div className="surface flex flex-col gap-3 p-5">
          <h3 className="font-display text-lg font-semibold">{t("roles")}</h3>
          <ul className="flex flex-wrap gap-x-4 gap-y-2">
            {catalog.roles.map((r) => (
              <li key={r.id}>
                {/* Cada rol tiene su página pública (/equipos/<juego>/<rol>). */}
                <Link
                  href={`/equipos/${game.id}/${r.slug}`}
                  className="chip min-h-11 underline underline-offset-4 hover:text-accent-soft"
                >
                  <RoleIcon slug={r.slug} className="size-4 text-muted" />
                  <span lang={lang}>{r.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="surface flex flex-col gap-3 p-5">
          <h3 className="font-display text-lg font-semibold">{t("modes")}</h3>
          <p lang={lang} className="text-sm">{catalog.modes.map((m) => `${m.name} (${t("players", { count: m.party_size })})`).join(" · ")}</p>
        </div>
        <div className="surface flex flex-col gap-3 p-5">
          <h3 className="font-display text-lg font-semibold">{t("ranks")}</h3>
          <p className="text-sm">
            {first && last ? t("rankRange", { first, last }) : t("noRanks")} {t("rankNote")}
          </p>
        </div>
        <div className="surface flex flex-col gap-3 p-5">
          <h3 className="font-display text-lg font-semibold">{t("regions")}</h3>
          <p lang={lang} className="text-sm">{catalog.regions.map((r) => r.name).join(" · ")}</p>
        </div>
      </section>

      {catalog.characters.some((c) => c.icon_url) && (
        <section aria-labelledby="personajes" className="flex flex-col gap-4">
          <h2 id="personajes" className="font-display text-2xl font-semibold">
            {t("charactersOf", { label: game.character_label ?? "", game: game.name })}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {catalog.characters.map((c, i) => (
              <li key={c.id} className="enter" style={{ "--i": i } as React.CSSProperties}>
                <CharacterIcon name={c.name} src={c.icon_url} size={40} decorative={false} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {others.length > 0 && (
        <nav aria-label={t("others")} className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {others.map((g) => (
            <Link key={g.id} href={`/equipos/${g.id}`} className="inline-flex min-h-11 items-center text-muted underline underline-offset-4 hover:text-text">
              {th("teamFor", { game: g.name })}
            </Link>
          ))}
        </nav>
      )}
    </article>
  );
}
