import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CharacterIcon, RoleIcon } from "@/components/game-icons";
import { APP_NAME } from "@/lib/config";
import { loadGames, themeStyle } from "@/lib/games";
import { catalogLang, INTL_LOCALE, OG_LOCALE } from "@/lib/i18n/locale";
import { loadCatalog } from "@/lib/profile/queries";
import {
  breadcrumbJsonLd,
  gamePagePath,
  jsonLdString,
  rolePagePath,
  roleSearchHref,
  siblingRoles,
} from "@/lib/role-pages";
import { publicRoleStats } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/supabase/env";

// Página pública por juego y rol («Busco Controlador en VALORANT»), pensada para buscadores. Roles del catálogo
// (game_roles) y cifras agregadas que puede leer cualquiera; nunca datos de un jugador concreto.

type RoleTexts = Record<string, Record<string, { what: string; lookFor: string }>>;

// Una sola carga por petición aunque la pidan los metadatos y la página.
const pageData = cache(async (gameId: string, roleSlug: string) => {
  const game = (await loadGames()).find((g) => g.id === gameId);
  if (!game) return null;
  const catalog = await loadCatalog(await createClient(), game.id);
  const role = catalog.roles.find((r) => r.slug === roleSlug);
  return role ? { game, role, catalog } : null;
});

export async function generateMetadata({ params }: PageProps<"/equipos/[juego]/[rol]">): Promise<Metadata> {
  const { juego, rol } = await params;
  const data = await pageData(juego, rol);
  if (!data) return {};
  const [t, locale] = await Promise.all([getTranslations("rolePage"), getLocale()]);
  const vars = { role: data.role.name, game: data.game.name };
  const title = t("metaTitle", vars);
  const description = t("metaDescription", vars);
  const url = rolePagePath(data.game.id, data.role.slug);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: APP_NAME,
      locale: OG_LOCALE[locale],
      title,
      description,
      url,
      // La imagen es ./opengraph-image.tsx; aquí solo para poner su texto alternativo en el idioma de la página.
      images: [{ url: `${url}/opengraph-image`, alt: t("ogAlt", { ...vars, app: APP_NAME }), width: 1200, height: 630, type: "image/png" }],
    },
  };
}

export default async function RolePage({ params }: PageProps<"/equipos/[juego]/[rol]">) {
  const { juego, rol } = await params;
  const data = await pageData(juego, rol);
  if (!data) notFound();
  const { game, role, catalog } = data;
  const supabase = await createClient();
  const [{ data: claims }, stats, t, tg, messages, locale, nonce] = await Promise.all([
    supabase.auth.getClaims(),
    publicRoleStats(game.id, role.id),
    getTranslations("rolePage"),
    getTranslations("gamePage"),
    getMessages(),
    getLocale(),
    headers().then((h) => h.get("x-nonce") ?? undefined),
  ]);
  const signedIn = Boolean(claims?.claims?.sub);
  const vars = { role: role.name, game: game.name, app: APP_NAME };
  // Texto propio de cada rol si existe; un rol nuevo del catálogo usa el genérico.
  const texts = (messages.rolePage.roles as RoleTexts)[game.id]?.[role.slug];
  const what = texts?.what ?? t("fallback.what", vars);
  const lookFor = texts?.lookFor ?? t("fallback.lookFor", vars);
  const characters = catalog.characters.filter((c) => c.role_id === role.id);
  const siblings = siblingRoles(catalog.roles, role.slug);
  const number = new Intl.NumberFormat(INTL_LOCALE[locale]);
  const lang = catalogLang(locale);
  const figures = [
    { value: stats.publicWithRole, label: t("statRole", vars) },
    { value: stats.players, label: t("statPlayers", vars) },
    { value: stats.availableNow, label: t("statNow", vars) },
  ].filter((f): f is { value: number; label: string } => f.value !== null);
  const crumbs = [
    { name: APP_NAME, path: "/" },
    { name: tg("title", { game: game.name }), path: gamePagePath(game.id) },
    { name: role.name, path: rolePagePath(game.id, role.slug) },
  ];

  return (
    <article className="flex flex-col gap-12" style={themeStyle(game)}>
      <script
        type="application/ld+json"
        nonce={nonce}
        // Migas de pan para buscadores (portada → juego → rol).
        dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumbJsonLd(siteUrl(), crumbs)) }}
      />

      <header className="flex flex-col gap-4">
        <nav aria-label={t("breadcrumb")} className="text-sm text-muted">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {crumbs.map((c, i) => (
              <li key={c.path} className="flex items-center gap-2">
                {i > 0 && <span aria-hidden="true">/</span>}
                {i < crumbs.length - 1 ? (
                  <Link href={c.path} className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-text">
                    {c.name}
                  </Link>
                ) : (
                  <span aria-current="page" lang={lang} className="text-text">
                    {c.name}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <h1 className="font-display flex max-w-3xl items-center gap-3 text-4xl font-bold leading-[1.1] sm:text-5xl">
          <RoleIcon slug={role.slug} className="size-9 shrink-0 text-accent sm:size-11" />
          {t("title", vars)}
        </h1>
        <p className="max-w-2xl text-lg text-muted">{t("lead", vars)}</p>
        <div className="flex flex-wrap gap-3">
          <Link href={roleSearchHref(role.slug, signedIn)} className="btn-primary">
            {signedIn ? t("searchSignedIn", vars) : t("searchSignIn", vars)}
          </Link>
          <Link href={gamePagePath(game.id)} className="btn-ghost">
            {t("backToGame", vars)}
          </Link>
        </div>
      </header>

      <section aria-labelledby="rol" className="grid gap-4 md:grid-cols-2">
        <div className="surface flex flex-col gap-3 p-5">
          <h2 id="rol" className="font-display text-lg font-semibold">
            {t("roleTitle")}
          </h2>
          <p>{what}</p>
        </div>
        <div className="surface flex flex-col gap-3 p-5">
          <h2 className="font-display text-lg font-semibold">{t("lookForTitle")}</h2>
          <p>{lookFor}</p>
        </div>
      </section>

      {figures.length > 0 && (
        <section aria-labelledby="cifras" className="flex flex-col gap-4">
          <h2 id="cifras" className="font-display text-2xl font-semibold">
            {t("statsTitle", vars)}
          </h2>
          <dl className="grid gap-4 sm:grid-cols-3">
            {figures.map((f) => (
              <div key={f.label} className="surface flex flex-col-reverse gap-1 p-5">
                <dt className="text-sm text-muted">{f.label}</dt>
                <dd className="font-display text-3xl font-bold">{number.format(f.value)}</dd>
              </div>
            ))}
          </dl>
          {stats.publicWithRole === 0 && <p>{t("emptyRole")}</p>}
          <p className="max-w-3xl text-sm text-muted">{t("statsNote")}</p>
        </section>
      )}

      {characters.length > 0 && (
        <section aria-labelledby="personajes" className="flex flex-col gap-4">
          <h2 id="personajes" className="font-display text-2xl font-semibold">
            {t("charactersTitle", { label: game.character_label ?? "", role: role.name })}
          </h2>
          <ul className="flex flex-wrap gap-3">
            {characters.map((c) => (
              <li key={c.id} className="chip">
                <CharacterIcon name={c.name} src={c.icon_url} size={32} />
                {c.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      {siblings.length > 0 && (
        <nav aria-labelledby="otros-roles" className="flex flex-col gap-3">
          <h2 id="otros-roles" className="font-display text-xl font-semibold">
            {t("siblingsTitle", vars)}
          </h2>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {siblings.map((r) => (
              <li key={r.id}>
                <Link
                  href={rolePagePath(game.id, r.slug)}
                  className="inline-flex min-h-11 items-center gap-2 underline underline-offset-4 hover:text-text"
                >
                  <RoleIcon slug={r.slug} className="size-4 text-muted" />
                  <span lang={lang}>{r.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </article>
  );
}
