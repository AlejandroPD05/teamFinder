// Nombre provisional: la marca no está aprobada (ver PROGRESS.md). Cambiar solo aquí.
export const APP_NAME = "TeamFinder";

// Rutas que exigen sesión. El proxy redirige a /entrar si no la hay.
export const PROTECTED_PREFIXES = ["/inicio", "/perfil"] as const;

export const DEFAULT_AFTER_LOGIN = "/inicio";
