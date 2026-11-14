import { Gamepad2, HeartHandshake, MessagesSquare, ShieldCheck, SlidersHorizontal, Swords, UsersRound } from "lucide-react";
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

const STEPS = [
  { Icon: Swords, key: "mode" },
  { Icon: SlidersHorizontal, key: "find" },
  { Icon: MessagesSquare, key: "coordinate" },
  { Icon: HeartHandshake, key: "play" },
] as const;

const FEATURES = [
  { Icon: UsersRound, key: "profiles" },
  { Icon: ShieldCheck, key: "privacy" },
  { Icon: Gamepad2, key: "perGame" },
] as const;

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
    <div className="flex flex-col gap-20 sm:gap-28">
      {deleted && (
        <p role="status" className="rounded-md border border-success bg-panel p-3 text-sm text-success">
          {t("deleted")}
        </p>
      )}

      <section className="relative flex flex-col items-center gap-7 pt-6 text-center sm:pt-14">
        <h1 className="font-display max-w-3xl text-4xl font-bold leading-[1.1] sm:text-6xl">
          {t("title", { game: game.name })}
        </h1>
        <p className="max-w-2xl text-lg text-muted">{t("lead")}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href={cta.href} className="btn-primary">
            {cta.text}
          </Link>
          <Link href={signedIn ? "/grupos" : "/demo"} className="btn-ghost">
            {signedIn ? t("openLobbies") : t("demo")}
          </Link>
        </div>

        <div className="mt-4 flex w-full justify-center">
          <GamePicker
            games={games}
            current={game.id}
            counts={Object.fromEntries((counts ?? []).map((c) => [c.game_id, c.players]))}
            nowCounts={Object.fromEntries((nowCounts ?? []).map((c) => [c.game_id, c.players]))}
          />
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

      <nav aria-labelledby="juegos" className="flex flex-col gap-4">
        <h2 id="juegos" className="font-display text-2xl font-semibold sm:text-3xl">
          {t("byGame")}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-3">
          {games.map((g) => (
            <li key={g.id}>
              <Link href={`/equipos/${g.id}`} className="surface surface-interactive flex min-h-11 flex-col gap-1 p-5">
                <span className="font-display text-lg font-semibold">{t("teamFor", { game: g.name })}</span>
                <span className="text-sm text-muted">{t("teamForHint")}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section aria-labelledby="como" className="flex flex-col gap-10">
        <h2 id="como" className="font-display text-2xl font-semibold sm:text-3xl">
          {t("howTitle")}
        </h2>
        {/* Pasos: un recorrido, no tarjetas. El orden lo da la lista. */}
        <ol className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ Icon, key }, i) => (
            <li key={key} className="flex flex-col gap-2 border-t border-line pt-5">
              <span className="flex items-center gap-3">
                <span aria-hidden="true" className="kicker tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <Icon aria-hidden="true" className="size-5 text-accent-soft" />
              </span>
              <h3 className="font-display text-lg font-semibold">{t(`steps.${key}.title`)}</h3>
              <p className="text-sm text-muted">{t(`steps.${key}.text`)}</p>
            </li>
          ))}
        </ol>

        <h3 id="funciones" className="sr-only">
          {t("featuresTitle")}
        </h3>
        <ul aria-labelledby="funciones" className="mt-4 grid gap-4 md:grid-cols-3">
          {FEATURES.map(({ Icon, key }) => (
            <li key={key} className="surface flex flex-col gap-3 p-6">
              <Icon aria-hidden="true" className="size-6 text-accent-soft" />
              <h4 className="font-display text-lg font-semibold">{t(`features.${key}.title`)}</h4>
              <p className="text-sm text-muted">{t(`features.${key}.text`)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="surface hud flex flex-col items-center gap-4 px-6 py-12 text-center">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">{t("readyTitle")}</h2>
        <p className="max-w-xl text-muted">{t("beta")} {t("readyText")}</p>
        <Link href={cta.href} className="btn-primary">
          {cta.text}
        </Link>
      </section>
    </div>
  );
}
