// Nombre provisional: la marca no está aprobada (ver PROGRESS.md). Cambiar solo aquí.
export const APP_NAME = "TeamFinder";

// Rutas que exigen sesión. El proxy redirige a /entrar si no la hay.
export const PROTECTED_PREFIXES = ["/inicio", "/perfil", "/buscar", "/grupos", "/mensajes", "/ajustes", "/moderacion"] as const;

export const DEFAULT_AFTER_LOGIN = "/inicio";

// Invitación oficial al Discord de la comunidad (opcional). Solo se muestra si es un enlace de invitación de Discord.
export function discordInvite(): string | null {
  const url = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL?.trim();
  return url && /^https:\/\/(discord\.gg|discord\.com\/invite)\/[A-Za-z0-9-]+$/.test(url) ? url : null;
}
