import type { Metadata, Viewport } from "next";
import { Chakra_Petch, Geist } from "next/font/google";
import { ExternalLink, LogIn, LogOut } from "lucide-react";
import Link from "next/link";
import { APP_NAME, discordInvite } from "@/lib/config";
import { es } from "@/lib/i18n/es";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./auth/salir/actions";
import { Logo } from "./logo";
import { SiteNav } from "./site-nav";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const chakra = Chakra_Petch({ variable: "--font-chakra", subsets: ["latin"], weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: es.meta.description,
};

export const viewport: Viewport = { themeColor: "#0b0c12" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const unread = signedIn
    ? ((await supabase.rpc("my_rooms")).data ?? []).reduce((n, r) => n + Number(r.unread ?? 0), 0)
    : 0;

  return (
    <html lang="es" className={`${geistSans.variable} ${chakra.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-panel focus:px-4 focus:py-2"
        >
          {es.nav.skip}
        </a>
        <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-md">
          <nav
            aria-label="Principal"
            className="mx-auto flex max-w-6xl flex-wrap items-center justify-between px-4 sm:h-16 sm:flex-nowrap sm:gap-4"
          >
            <Link href={signedIn ? "/inicio" : "/"} className="flex min-h-14 items-center" aria-label={`${APP_NAME}, inicio`}>
              <Logo />
            </Link>
            {signedIn ? (
              <>
                <SiteNav unread={unread} />
                <form action={signOut}>
                  <button
                    type="submit"
                    className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-md px-3 text-sm text-muted hover:bg-panel hover:text-text"
                  >
                    <LogOut aria-hidden="true" className="size-4" />
                    {es.nav.logout}
                  </button>
                </form>
              </>
            ) : (
              <Link href="/entrar" className="btn-ghost">
                <LogIn aria-hidden="true" className="size-4" />
                {es.nav.login}
              </Link>
            )}
          </nav>
        </header>
        <main id="contenido" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-12">
          {children}
        </main>
        <footer className="mt-12 border-t border-line bg-bg-raised/60">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-muted">
            <nav aria-label="Pie" className="flex flex-wrap items-center gap-x-5">
              <span className="font-display text-text">{APP_NAME} · beta</span>
              <Link href="/normas" className="inline-flex min-h-11 items-center hover:text-text">
                Normas
              </Link>
              <Link href="/privacidad" className="inline-flex min-h-11 items-center hover:text-text">
                Privacidad
              </Link>
              {discordInvite() && (
                <a href={discordInvite()!} rel="noopener noreferrer" target="_blank" className="inline-flex min-h-11 items-center gap-1.5 hover:text-text">
                  Discord de la comunidad
                  <ExternalLink aria-hidden="true" className="size-3.5" />
                  <span className="sr-only"> (se abre en otra pestaña)</span>
                </a>
              )}
            </nav>
            <p lang="en" className="max-w-3xl text-xs leading-relaxed">
              {es.legal.riot}
            </p>
            <p className="max-w-3xl text-xs leading-relaxed">{es.legal.riotEs}</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
