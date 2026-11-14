import type { Metadata, Viewport } from "next";
import { Chakra_Petch, Geist } from "next/font/google";
import { Bell, ExternalLink, LogIn, LogOut } from "lucide-react";
import Link from "next/link";
import { APP_NAME, discordInvite, GOOGLE_SITE_VERIFICATION } from "@/lib/config";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { clientMessages } from "@/i18n/client-messages";
import type { Messages } from "@/lib/i18n/translator";
import { OG_LOCALE } from "@/lib/i18n/locale";
import { LanguageSwitcher } from "./language-switcher";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./auth/salir/actions";
import { GameSync } from "./game-switcher";
import { Logo } from "./logo";
import { currentGame, themeStyle } from "@/lib/games";
import { SiteNav } from "./site-nav";
import { SpotlightTracker } from "@/components/spotlight-tracker";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { LiveAlerts } from "./live-alerts";
import { NumberRoll } from "@/components/number-roll";
import { indexable } from "@/lib/seo";
import { siteUrl } from "@/lib/supabase/env";
import "./globals.css";

// Rendimiento en móvil: solo se precarga Geist (un archivo variable, el texto de casi todo). Los tres pesos de
// Chakra Petch (títulos) llegan cuando el CSS los pide: con `swap`, el título se pinta antes con la fuente de
// reserva ajustada y no compite por la red con el HTML y el CSS en conexiones lentas.
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const chakra = Chakra_Petch({
  variable: "--font-chakra",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  preload: false,
});

// El favicon es el logo de la web con el color del juego elegido (src/app/icono/[juego]). Títulos en el idioma elegido.
export async function generateMetadata(): Promise<Metadata> {
  const [{ game }, locale, t] = await Promise.all([currentGame(), getLocale(), getTranslations("meta")]);
  const id = encodeURIComponent(game?.id ?? "valorant");
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: t("title"), template: `%s · ${APP_NAME}` },
    description: t("description"),
    applicationName: APP_NAME,
    openGraph: {
      type: "website",
      siteName: APP_NAME,
      locale: OG_LOCALE[locale],
      title: t("title"),
      description: t("description"),
      // La imagen es src/app/opengraph-image.tsx; aquí solo para poner su texto alternativo en el idioma de la página.
      images: [{ url: "/opengraph-image", alt: t("ogAlt", { app: APP_NAME }), width: 1200, height: 630, type: "image/png" }],
    },
    twitter: { card: "summary_large_image" },
    robots: indexable() ? undefined : { index: false, follow: false },
    // Verificación de Google Search Console (meta etiqueta). No es secreto: Google lo lee del HTML público.
    verification: { google: process.env.GOOGLE_SITE_VERIFICATION || GOOGLE_SITE_VERIFICATION },
    icons: {
      icon: [{ url: `/icono/${id}`, type: "image/svg+xml" }],
      apple: [{ url: `/icono/${id}/apple`, sizes: "180x180", type: "image/png" }],
    },
  };
}

export const viewport: Viewport = { themeColor: "#0b0c12" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const [{ data }, locale, t, messages] = await Promise.all([
    supabase.auth.getClaims(),
    getLocale(),
    getTranslations(),
    getMessages(),
  ]);
  const signedIn = Boolean(data?.claims?.sub);
  const { game, games, saved } = await currentGame();
  // Sin leer: salas de grupo + mensajes privados (pestaña Mensajes) y notificaciones (campana).
  const [rooms, dms, notes] = signedIn
    ? await Promise.all([
        supabase.rpc("my_rooms"),
        supabase.rpc("my_conversations"),
        supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
      ])
    : [null, null, null];
  const unread =
    (rooms?.data ?? []).reduce((n, r) => n + Number(r.unread ?? 0), 0) +
    (dms?.data ?? []).reduce((n, c) => n + (c.blocked ? 0 : Number(c.unread ?? 0)), 0);
  const unreadNotes = notes?.count ?? 0;

  return (
    <html lang={locale} data-game={game?.id} style={themeStyle(game)} className={`${geistSans.variable} ${chakra.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        {/* Al navegador solo van los textos que usan los componentes de cliente (src/i18n/client-messages.ts). */}
        <NextIntlClientProvider messages={clientMessages(messages as Messages)}>
        <SpotlightTracker />
        <ServiceWorkerRegister />
        {signedIn && <LiveAlerts me={data!.claims!.sub as string} />}
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-panel focus:px-4 focus:py-2"
        >
          {t("nav.skip")}
        </a>
        <header className="site-header sticky top-0 z-40">
          <nav
            aria-label={t("nav.main")}
            className="mx-auto flex max-w-6xl flex-wrap items-center justify-between px-4 lg:h-16 lg:flex-nowrap lg:gap-4"
          >
            <Link href="/" className="flex min-h-14 items-center" aria-label={t("nav.home", { app: APP_NAME })}>
              <Logo />
            </Link>
            <GameSync games={games} current={game?.id ?? ""} saved={saved} />
            {signedIn ? (
              <>
                <SiteNav unread={unread} />
                <div className="flex items-center">
                <Link
                  href="/notificaciones"
                  aria-label={unreadNotes > 0 ? t("nav.notificationsUnread", { count: unreadNotes }) : t("nav.notifications")}
                  className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted hover:bg-panel hover:text-text"
                >
                  <Bell aria-hidden="true" className="size-5" />
                  {unreadNotes > 0 && (
                    <span aria-hidden="true" className="absolute right-0.5 top-0.5 rounded-full bg-accent px-1.5 text-[0.65rem] font-semibold leading-4 text-bg">
                      <NumberRoll value={unreadNotes} max={99} />
                    </span>
                  )}
                </Link>
                <form action={signOut}>
                  <button
                    type="submit"
                    className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-md px-3 text-sm text-muted hover:bg-panel hover:text-text"
                  >
                    <LogOut aria-hidden="true" className="size-4" />
                    {t("nav.logout")}
                  </button>
                </form>
                </div>
              </>
            ) : (
              <Link href="/entrar" className="btn-ghost">
                <LogIn aria-hidden="true" className="size-4" />
                {t("nav.login")}
              </Link>
            )}
          </nav>
        </header>
        <main id="contenido" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-12">
          {children}
        </main>
        <footer className="mt-12 border-t border-line bg-bg-raised">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-muted">
            <nav aria-label={t("footer.label")} className="flex flex-wrap items-center gap-x-5">
              <span className="font-display text-text">{t("footer.beta", { app: APP_NAME })}</span>
              <Link href="/demo" className="inline-flex min-h-11 min-w-11 items-center hover:text-text">
                {t("footer.demo")}
              </Link>
              <Link href="/normas" className="inline-flex min-h-11 min-w-11 items-center hover:text-text">
                {t("footer.rules")}
              </Link>
              <Link href="/privacidad" className="inline-flex min-h-11 min-w-11 items-center hover:text-text">
                {t("footer.privacy")}
              </Link>
              <Link href="/sugerencias" className="inline-flex min-h-11 min-w-11 items-center hover:text-text">
                {t("footer.feedback")}
              </Link>
              <Link href="/novedades" className="inline-flex min-h-11 min-w-11 items-center hover:text-text">
                {t("changelog.footerLink")}
              </Link>
              {discordInvite() && (
                <a href={discordInvite()!} rel="noopener noreferrer" target="_blank" className="inline-flex min-h-11 items-center gap-1.5 hover:text-text">
                  {t("footer.discord")}
                  <ExternalLink aria-hidden="true" className="size-3.5" />
                  <span className="sr-only"> {t("common.newTab")}</span>
                </a>
              )}
            </nav>
            <LanguageSwitcher />
            <p lang="en" className="max-w-3xl text-xs leading-relaxed">
              {t("legal.riot")}
            </p>
            <p lang="en" className="max-w-3xl text-xs leading-relaxed">
              {t("legal.valve")} {t("legal.ea")}
            </p>
            <p className="max-w-3xl text-xs leading-relaxed">{t("legal.fan")}</p>
          </div>
        </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
