import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isProtectedPath } from "@/lib/auth";
import { GAME_COOKIE, GAME_COOKIE_MAX_AGE, gameFromPath } from "@/lib/config";
import { supabaseEnv } from "@/lib/supabase/env";

// Refresca la sesión en cada petición y protege las rutas privadas.
export async function proxy(request: NextRequest) {
  // En /equipos/<juego> la web entera (cabecera, colores) pasa a ese juego, también para quien llega desde un buscador.
  // Sin redirección: el juego se inyecta en esta petición y se recuerda para las siguientes. El layout lo valida.
  const pathGame = gameFromPath(request.nextUrl.pathname);
  if (pathGame) request.cookies.set(GAME_COOKIE, pathGame);
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
  if (pathGame) {
    response.cookies.set(GAME_COOKIE, pathGame, { path: "/", maxAge: GAME_COOKIE_MAX_AGE, sameSite: "lax", httpOnly: true });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
