// Avisos de errores del servidor a un webhook de Discord (sin cuentas ni dependencias nuevas).
// Funciones puras para poder probarlas; el envío real está en src/instrumentation.ts.
// Nunca se mandan cookies, cabeceras, query strings, ids de usuario ni otros datos personales.

/** Longitud máxima del mensaje de error dentro del aviso. */
export const MAX_ERROR_MESSAGE = 300;

const DISCORD_HOSTS = new Set(["discord.com", "discordapp.com"]);
const WEBHOOK_PATH = /^\/api\/webhooks\/\d{5,25}\/[\w-]{20,200}$/;

/** Solo acepta https://discord.com/api/webhooks/<id>/<token> (o discordapp.com), sin nada más. */
export function isDiscordWebhookUrl(raw: string | undefined | null): raw is string {
  if (!raw) return false;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return false;
  }
  return (
    url.protocol === "https:" &&
    DISCORD_HOSTS.has(url.hostname) &&
    url.port === "" &&
    url.username === "" &&
    url.password === "" &&
    url.search === "" &&
    url.hash === "" &&
    WEBHOOK_PATH.test(url.pathname)
  );
}

/** Solo en producción: en Vercel, únicamente el despliegue de producción (no las previews). */
export function alertsEnabled(env: NodeJS.ProcessEnv): boolean {
  if (env.NODE_ENV !== "production") return false;
  if (env.VERCEL_ENV !== undefined && env.VERCEL_ENV !== "production") return false;
  return isDiscordWebhookUrl(env.ERROR_WEBHOOK_URL);
}

/** Mensaje y digest del error, sea cual sea su forma. */
export function describeError(error: unknown): { message: string; digest?: string } {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "Error desconocido";
  const digest =
    typeof error === "object" && error !== null && "digest" in error && error.digest != null
      ? String(error.digest)
      : undefined;
  return { message, digest };
}

/**
 * Limpia el mensaje de error: oculta correos, UUID (ids de usuario y de filas) y URLs
 * (podrían llevar tokens o query strings), quita saltos de línea y lo recorta.
 */
export function sanitizeErrorMessage(message: string, max = MAX_ERROR_MESSAGE): string {
  const clean = message
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, "[correo]")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "[id]")
    .replace(/\b[a-z][a-z0-9+.-]*:\/\/\S+/gi, "[url]")
    .replace(/`/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  if (clean.length <= max) return clean || "(sin mensaje)";
  return `${clean.slice(0, max - 1)}…`;
}

/** Solo campos técnicos: nada de la petición salvo el método. */
export type ErrorAlert = {
  /** Ruta del fichero de la página (p. ej. /equipos/[juego]), no la URL real. */
  routePath: string;
  method: string;
  routeType: string;
  renderSource?: string;
  message: string;
  digest?: string;
};

/** Texto plano para el campo `content` de Discord (límite de 2000 caracteres). */
export function buildAlertContent(alert: ErrorAlert): string {
  const inline = (value: string) => value.replace(/[`\r\n]/g, "").slice(0, 120);
  const origin = [alert.routeType, alert.renderSource].filter(Boolean).map((v) => inline(v!)).join(" · ");
  const lines = [
    "**Error en el servidor (producción)**",
    `Ruta: \`${inline(alert.method.toUpperCase())} ${inline(alert.routePath) || "?"}\``,
    `Origen: \`${origin || "?"}\``,
    `Digest: \`${alert.digest ? inline(alert.digest) : "—"}\``,
    "```",
    sanitizeErrorMessage(alert.message),
    "```",
  ];
  return lines.join("\n");
}

/** Cuerpo del POST al webhook; sin menciones para que un mensaje no pueda hacer @everyone. */
export function buildWebhookBody(alert: ErrorAlert): string {
  return JSON.stringify({ content: buildAlertContent(alert), allowed_mentions: { parse: [] } });
}

/**
 * Limitador en memoria (por instancia): como mucho un aviso por clave en `windowMs` y
 * `maxPerWindow` avisos en total por ventana, para que un bucle de errores no inunde el canal.
 */
export function createRateLimiter({
  windowMs = 10 * 60 * 1000,
  maxPerWindow = 10,
  maxKeys = 200,
}: { windowMs?: number; maxPerWindow?: number; maxKeys?: number } = {}) {
  const lastSent = new Map<string, number>();
  let sentInWindow: number[] = [];

  return function allow(key: string, now = Date.now()): boolean {
    // Olvida lo que ya salió de la ventana para que la memoria no crezca.
    for (const [k, at] of lastSent) if (now - at >= windowMs) lastSent.delete(k);
    sentInWindow = sentInWindow.filter((at) => now - at < windowMs);

    if (lastSent.has(key)) return false;
    if (sentInWindow.length >= maxPerWindow) return false;
    if (lastSent.size >= maxKeys) return false;

    lastSent.set(key, now);
    sentInWindow.push(now);
    return true;
  };
}

/** Clave de deduplicación: misma ruta y mismo mensaje = mismo aviso. */
export function alertKey(alert: Pick<ErrorAlert, "routePath" | "message">): string {
  return `${alert.routePath}|${sanitizeErrorMessage(alert.message)}`;
}
