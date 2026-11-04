import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import { APP_NAME } from "@/lib/config";
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
            className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4"
          >
            <Link href="/" className="text-base font-semibold tracking-tight">
              {APP_NAME}
            </Link>
            {signedIn ? (
              <div className="flex items-center gap-1">
                <Link
                  href="/perfil/editar"
                  className="inline-flex min-h-11 items-center rounded-md px-3 text-sm text-muted hover:bg-panel hover:text-text"
                >
                  {es.nav.profile}
                </Link>
                <form action={signOut}>
                  <button
                    type="submit"
                    className="min-h-11 rounded-md px-3 text-sm text-muted hover:bg-panel hover:text-text"
                  >
                    {es.nav.logout}
                  </button>
                </form>
              </div>
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
      </body>
    </html>
  );
}
