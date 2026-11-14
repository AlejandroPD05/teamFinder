/** Cabecera de la petición donde el proxy deja el nonce de la CSP para leerlo con `headers()` (p. ej. JSON-LD). */
export const NONCE_HEADER = "x-nonce";

/** Nonce aleatorio y distinto en cada petición (base64 de 16 bytes). */
export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

function origins(supabaseUrl: string | undefined): { http: string; ws: string } | null {
  try {
    const u = new URL(supabaseUrl ?? "");
    return { http: u.origin, ws: `${u.protocol === "https:" ? "wss:" : "ws:"}//${u.host}` };
  } catch {
    return null;
  }
}

/**
 * Content-Security-Policy estricta con nonce (la que recomienda Next en node_modules/next/dist/docs/01-app/02-guides/
 * content-security-policy.md). Solo se ejecutan los scripts que llevan el nonce de esta respuesta y lo que estos
 * carguen ('strict-dynamic'); Next pone el nonce en sus propios scripts al leerlo de esta cabecera en la petición.
 * Los estilos admiten 'unsafe-inline' (Tailwind y los atributos style del tema por juego).
 */
export function contentSecurityPolicy(
  nonce: string,
  { supabaseUrl, dev = false }: { supabaseUrl?: string; dev?: boolean } = {},
): string {
  const supabase = origins(supabaseUrl);
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // En desarrollo React usa eval para reconstruir las trazas de error del servidor; en producción no.
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(dev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    // Avatares de Discord, iconos de juegos, arte de Apex, miniaturas de YouTube (luz ambiental) y fanart de Supabase.
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      ...(supabase ? [supabase.http] : []),
      "https://cdn.discordapp.com",
      "https://media.valorant-api.com",
      "https://drop-assets.ea.com",
      "https://i.ytimg.com",
    ],
    "font-src": ["'self'"],
    // API de Supabase y Realtime (WebSocket) para chats y avisos en directo.
    "connect-src": ["'self'", ...(supabase ? [supabase.http, supabase.ws] : [])],
    // Reproductores de clips: solo estos proveedores pueden ir en un iframe (ver src/lib/clips/links.ts).
    "frame-src": ["https://www.youtube-nocookie.com", "https://clips.twitch.tv", "https://streamable.com"],
    "worker-src": ["'self'"],
    "manifest-src": ["'self'"],
    "media-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    // Formularios solo a la propia web y al login de Supabase/Discord.
    "form-action": ["'self'", ...(supabase ? [supabase.http] : []), "https://discord.com"],
    "frame-ancestors": ["'none'"],
  };
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}
