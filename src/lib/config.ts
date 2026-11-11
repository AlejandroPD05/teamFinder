// Nombre provisional: la marca no está aprobada (ver PROGRESS.md). Cambiar solo aquí.
export const APP_NAME = "TeamFinder";

// Rutas que exigen sesión. El proxy redirige a /entrar si no la hay.
export const PROTECTED_PREFIXES = ["/inicio", "/perfil", "/buscar", "/grupos", "/mensajes", "/ajustes", "/moderacion", "/misiones", "/coleccion", "/clips"] as const;

export const DEFAULT_AFTER_LOGIN = "/inicio";

// Propiedad de Google Search Console de https://teamfinder-seven.vercel.app (método «etiqueta HTML»).
export const GOOGLE_SITE_VERIFICATION = "RN-BBIIeqlq23AQBfeTiO0Uu6D8tRBW79dmF4fVEwsQ";

// Juego activo (tema y catálogo). Lo fija el selector o la página pública de cada juego (/equipos/<juego>).
export const GAME_COOKIE = "tf_game";
export const GAME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Cabecera interna (proxy → servidor) con el juego de la URL en /equipos/<juego>. */
export const PATH_GAME_HEADER = "x-tf-path-game";

/** Juego de la URL en las páginas públicas por juego. */
export function gameFromPath(pathname: string): string | null {
  return /^\/equipos\/([a-z0-9-]{2,32})$/.exec(pathname)?.[1] ?? null;
}

// Acceso por enlace de correo. Se apaga con NEXT_PUBLIC_EMAIL_LOGIN=off mientras no haya un SMTP propio:
// el SMTP por defecto de Supabase solo entrega a direcciones del equipo del proyecto.
export function emailLoginEnabled(): boolean {
  return process.env.NEXT_PUBLIC_EMAIL_LOGIN !== "off";
}

// Invitación oficial al Discord de la comunidad (opcional). Solo se muestra si es un enlace de invitación de Discord.
export function discordInvite(): string | null {
  const url = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL?.trim();
  return url && /^https:\/\/(discord\.gg|discord\.com\/invite)\/[A-Za-z0-9-]+$/.test(url) ? url : null;
}
