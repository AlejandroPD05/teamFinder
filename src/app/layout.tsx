import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import { APP_NAME, discordInvite } from "@/lib/config";
import { es } from "@/lib/i18n/es";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./auth/salir/actions";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

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
    <html lang="es" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-panel focus:px-4 focus:py-2"
        >
          {es.nav.skip}
        </a>
        <header className="border-b border-line">
          <nav
            aria-label="Principal"
            className="mx-auto flex max-w-5xl flex-wrap items-center justify-between px-4 sm:h-14 sm:flex-nowrap"
          >
            <Link href="/" className="flex min-h-14 items-center text-base font-semibold tracking-tight">
              {APP_NAME}
            </Link>
            {signedIn ? (
              <>
                {/* En móvil, segunda fila a lo ancho; en escritorio, en línea. */}
                <div className="order-last -mx-3 flex w-full border-t border-line sm:order-none sm:mx-0 sm:ml-auto sm:w-auto sm:border-0">
                  {[
                    ["/buscar", es.nav.search],
                    ["/grupos", es.nav.lobbies],
                    ["/mensajes", es.nav.inbox],
                    ["/perfil/editar", es.nav.profile],
                  ].map(([href, text]) => (
                    <Link
                      key={href}
                      href={href}
                      className="inline-flex min-h-11 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-md px-2 text-sm text-muted hover:bg-panel hover:text-text sm:flex-none sm:px-3"
                    >
                      {text}
                      {href === "/mensajes" && unread > 0 && (
                        <span className="rounded-full bg-accent px-1.5 text-xs font-semibold text-bg">
                          {unread > 99 ? "99+" : unread}
                          <span className="sr-only"> sin leer</span>
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
                <form action={signOut} className="sm:ml-1">
                  <button
                    type="submit"
                    className="min-h-11 whitespace-nowrap rounded-md px-3 text-sm text-muted hover:bg-panel hover:text-text"
                  >
                    {es.nav.logout}
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/entrar"
                className="inline-flex min-h-11 items-center rounded-md px-3 text-sm text-muted hover:bg-panel hover:text-text"
              >
                {es.nav.login}
              </Link>
            )}
          </nav>
        </header>
        <main id="contenido" className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
          {children}
        </main>
        <footer className="border-t border-line">
          <nav aria-label="Pie" className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 px-4 py-3 text-sm text-muted">
            <span>{APP_NAME} · beta</span>
            <Link href="/normas" className="inline-flex min-h-11 items-center hover:text-text">
              Normas
            </Link>
            <Link href="/privacidad" className="inline-flex min-h-11 items-center hover:text-text">
              Privacidad
            </Link>
            {discordInvite() && (
              <a href={discordInvite()!} rel="noopener noreferrer" target="_blank" className="inline-flex min-h-11 items-center hover:text-text">
                Discord de la comunidad<span className="sr-only"> (se abre en otra pestaña)</span>
              </a>
            )}
          </nav>
        </footer>
      </body>
    </html>
  );
}
