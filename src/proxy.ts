import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isProtectedPath } from "@/lib/auth";
import { gameFromPath, PATH_GAME_HEADER } from "@/lib/config";
import { contentSecurityPolicy, createNonce, NONCE_HEADER } from "@/lib/csp";
import { supabaseEnv } from "@/lib/supabase/env";

// Refresca la sesión en cada petición, protege las rutas privadas y pone la CSP con un nonce nuevo.
export async function proxy(request: NextRequest) {
  // CSP con nonce: va también en la petición para que Next lo lea y lo ponga en sus scripts (y `headers()` en los
  // nuestros, p. ej. el JSON-LD de la portada). Todas las páginas son dinámicas (dependen de la sesión).
  const nonce = createNonce();
  const csp = contentSecurityPolicy(nonce, {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    dev: process.env.NODE_ENV === "development",
  });
  request.headers.set(NONCE_HEADER, nonce);
  request.headers.set("Content-Security-Policy", csp);
  // En /equipos/<juego> la página se pinta con ese juego (también para quien llega desde un buscador) sin tocar la
  // cookie: aquí no se distingue una visita de una precarga de enlace (Next quita esas cabeceras antes del proxy), y
  // guardar la elección en una precarga cambiaba el juego al pasar por la portada. El selector la guarda en el cliente.
  request.headers.delete(PATH_GAME_HEADER);
  const pathGame = gameFromPath(request.nextUrl.pathname);
  if (pathGame) request.headers.set(PATH_GAME_HEADER, pathGame);
  let response = NextResponse.next({ request });
  const { url, key } = supabaseEnv();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // getClaims valida el JWT; no usar getSession en el servidor.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const { pathname, search } = request.nextUrl;

  if (!signedIn && isProtectedPath(pathname)) {
    const login = request.nextUrl.clone();
    login.pathname = "/entrar";
    login.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(login);
  }
  if (signedIn && pathname === "/entrar") {
    const home = request.nextUrl.clone();
    home.pathname = "/inicio";
    home.search = "";
    return NextResponse.redirect(home);
  }
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icono/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
