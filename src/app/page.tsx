import { Gamepad2, ShieldCheck, UsersRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { GamePicker } from "./game-switcher";
import { currentGame } from "@/lib/games";
import { APP_NAME } from "@/lib/config";
import { siteUrl } from "@/lib/supabase/env";
import { NONCE_HEADER } from "@/lib/csp";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

/*
 * Portada (rediseño Hallmark, 2026-11-21): una frase grande arriba y, debajo, lo que hay ahora mismo (el selector de
 * juego con jugadores reales), el producto en capturas de la demo (datos ficticios y marcados), lo que incluye, los
 * equipos por juego y la primera partida. Sin cifras inventadas ni testimonios.
 */

const FEATURES = [
  { Icon: UsersRound, key: "profiles" },
  { Icon: ShieldCheck, key: "privacy" },
  { Icon: Gamepad2, key: "perGame" },
] as const;

/** Capturas de /demo (datos ficticios). Se rehacen con capture.mjs cuando cambia el aspecto de la web. */
const SHOTS = {
  find: { src: "/capturas/d-buscar-demo-desktop-part.png", width: 2240, height: 890 },
  coordinate: { src: "/capturas/d-grupo-demo-desktop-part.png", width: 2240, height: 672 },
  play: { src: "/capturas/d-perfil-demo-desktop-part.png", width: 2240, height: 416 },
} as const;

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function Home({ searchParams }: PageProps<"/">) {
  // Supabase devuelve aquí los errores de OAuth (p. ej. estado caducado): llevarlos al login con aviso.
  const sp = await searchParams;
  if (sp.error) redirect("/entrar?error=oauth");
  const deleted = sp.cuenta === "borrada";

  const supabase = await createClient();
  const { game, games } = await currentGame();
  const [{ data: claims }, { data: counts }, { data: nowCounts }] = await Promise.all([
    supabase.auth.getClaims(),
    supabase.rpc("game_player_counts"),
    supabase.rpc("available_counts"),
  ]);
  const [t, tm, locale, head] = await Promise.all([getTranslations("home"), getTranslations("meta"), getLocale(), headers()]);
  const signedIn = Boolean(claims?.claims?.sub);
  const cta = signedIn ? { href: "/buscar", text: t("ctaSignedIn") } : { href: "/entrar", text: t("cta") };

  return (
    <div className="flex flex-col gap-(--section-gap)">
      {deleted && (
        <p role="status" className="rounded-md border border-success bg-panel p-3 text-sm text-success">
          {t("deleted")}
        </p>
      )}

      {/* Portada tipo cartel: la frase manda; la frase de apoyo y las dos acciones, a sus pies. */}
      <section className="flex min-h-[52svh] flex-col justify-end gap-(--space-lg) pt-(--space-xl)">
        <h1 className="font-display max-w-[16ch] text-poster font-bold leading-[0.98] tracking-[-0.02em]">
          {t("title", { game: game.name })}
        </h1>
        <div className="flex flex-col gap-(--space-lg) lg:flex-row lg:items-end lg:justify-between">
          <p className="max-w-[34ch] text-lead text-muted">{t("lead")}</p>
          <div className="flex flex-wrap gap-(--space-sm)">
            <Link href={cta.href} className="btn-primary">
              {cta.text}
            </Link>
            <Link href={signedIn ? "/grupos" : "/demo"} className="btn-ghost">
              {signedIn ? t("openLobbies") : t("demo")}
            </Link>
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        nonce={head.get(NONCE_HEADER) ?? undefined}
        // Datos estructurados para buscadores: el sitio y lo que ofrece.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: APP_NAME,
            url: siteUrl(),
            inLanguage: locale,
            description: tm("description"),
          }),
        }}
      />

      {/* Lo que hay ahora mismo: cada juego con sus jugadores reales y quién está disponible. Cambia el juego de toda la web. */}
      <section aria-labelledby="ahora" className="flex flex-col gap-(--space-xl) border-t border-line pt-(--space-2xl)">
        <div className="flex flex-col gap-(--space-md) lg:flex-row lg:items-end lg:justify-between">
          <h2 id="ahora" className="font-display text-section font-semibold leading-[1.05]">
            {t("nowTitle")}
          </h2>
          <p className="max-w-[40ch] text-muted">{t("nowText")}</p>
        </div>
        <GamePicker
          games={games}
          current={game.id}
          counts={Object.fromEntries((counts ?? []).map((c) => [c.game_id, c.players]))}
          nowCounts={Object.fromEntries((nowCounts ?? []).map((c) => [c.game_id, c.players]))}
        />
      </section>

      {/* El producto, tal cual: capturas de la demo. Cada paso va como pie de su captura. */}
      <section aria-labelledby="como" className="flex flex-col gap-(--space-xl)">
        <div className="flex max-w-3xl flex-col gap-(--space-md)">
          <h2 id="como" className="font-display text-section font-semibold leading-[1.05]">
            {t("howTitle")}
          </h2>
          <p className="text-lead text-muted">{t("steps.mode.text")}</p>
        </div>
        <figure className="flex flex-col gap-(--space-sm)">
          <Shot {...SHOTS.find} alt={t("shots.find")} sizes="(min-width: 72rem) 72rem, 100vw" />
          <figcaption className="text-sm text-muted">
            <span className="font-semibold text-text">{t("steps.find.title")}.</span> {t("steps.find.text")}
          </figcaption>
        </figure>
        <div className="grid gap-(--space-xl) lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <figure className="flex flex-col gap-(--space-sm)">
            <Shot {...SHOTS.coordinate} alt={t("shots.coordinate")} sizes="(min-width: 72rem) 42rem, 100vw" />
            <figcaption className="text-sm text-muted">
              <span className="font-semibold text-text">{t("steps.coordinate.title")}.</span> {t("steps.coordinate.text")}
            </figcaption>
          </figure>
          <figure className="flex flex-col gap-(--space-sm)">
            <Shot {...SHOTS.play} alt={t("shots.play")} sizes="(min-width: 72rem) 30rem, 100vw" />
            <figcaption className="text-sm text-muted">
              <span className="font-semibold text-text">{t("steps.play.title")}.</span> {t("steps.play.text")}
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Lo que incluye: tres cosas, con el título grande y una línea; el icono en línea, sin baldosa. */}
      <section aria-labelledby="funciones" className="flex flex-col gap-(--space-xl)">
        <h2 id="funciones" className="font-display max-w-[20ch] text-section font-semibold leading-[1.05]">
          {t("featuresTitle")}
        </h2>
        <ul className="grid gap-(--space-xl) md:grid-cols-3">
          {FEATURES.map(({ Icon, key }) => (
            <li key={key} className="flex flex-col gap-(--space-sm) border-t border-line-strong pt-(--space-lg)">
              <h3 className="font-display flex items-start gap-(--space-sm) text-title font-semibold leading-tight">
                <Icon aria-hidden="true" className="mt-1 size-6 shrink-0 text-accent-soft" />
                {t(`features.${key}.title`)}
              </h3>
              <p className="text-muted">{t(`features.${key}.text`)}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Equipos por juego: una fila por juego que lleva a su página (roles, rangos, modos y servidores). */}
      <nav aria-labelledby="juegos" className="flex flex-col gap-(--space-lg)">
        <h2 id="juegos" className="font-display text-section font-semibold leading-[1.05]">
          {t("byGame")}
        </h2>
        <ul className="flex flex-col">
          {games.map((g) => (
            <li key={g.id} className="border-t border-line last:border-b">
              <Link
                href={`/equipos/${g.id}`}
                className="group grid min-h-20 items-center gap-(--space-xs) py-(--space-md) sm:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] sm:gap-(--space-xl)"
              >
                <span className="font-display text-title font-semibold transition-colors duration-200 group-hover:text-accent-soft">
                  {t("teamFor", { game: g.name })}
                </span>
                <span className="text-muted">{t("teamForHint")}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Cierre: la primera partida, en una banda que cambia de fondo. */}
      <section aria-labelledby="listo" className="-mx-4 bg-bg-raised px-4 py-(--section-gap-s) sm:mx-0 sm:rounded-(--radius-card) sm:px-(--space-2xl)">
        <div className="flex flex-col gap-(--space-lg) lg:flex-row lg:items-end lg:justify-between">
          <div className="flex max-w-2xl flex-col gap-(--space-md)">
            <h2 id="listo" className="font-display text-section font-semibold leading-[1.05]">
              {t("readyTitle")}
            </h2>
            <p className="text-lead text-muted">{t("readyText")}</p>
            <p className="text-sm text-muted">{t("beta")}</p>
          </div>
          <Link href={cta.href} className="btn-primary self-start lg:self-end">
            {cta.text}
          </Link>
        </div>
      </section>
    </div>
  );
}

/** Captura del producto con el marco de la marca (radio y contorno), nunca dentro de un navegador dibujado. */
function Shot({ src, width, height, alt, sizes }: { src: string; width: number; height: number; alt: string; sizes: string }) {
  return (
    <div data-slot={src.split("/").pop()} data-kind="product" className="overflow-hidden rounded-(--radius-card) outline-1 -outline-offset-1 outline-line">
      <Image src={src} width={width} height={height} alt={alt} sizes={sizes} className="h-auto w-full" />
    </div>
  );
}
