import { APP_NAME } from "../config";

// Textos de la UI. Un solo idioma por ahora; añadir otros con la misma forma.
export const es = {
  meta: {
    description: "Encuentra compañeros para hacer stack en VALORANT.",
  },
  nav: {
    skip: "Saltar al contenido",
    login: "Entrar",
    logout: "Salir",
    profile: "Mi perfil",
    search: "Buscar",
    lobbies: "Grupos",
    inbox: "Mensajes",
  },
  home: {
    title: "Encuentra con quién hacer stack",
    lead: "Perfiles con rango, roles y agentes, búsqueda con filtros y grupos para DuoQ, TrioQ o FiveStack. Empezamos por VALORANT.",
    cta: "Entrar para empezar",
    ctaSignedIn: "Buscar jugadores",
    beta: "Beta en pruebas: puede haber errores.",
  },
  login: {
    title: `Entrar en ${APP_NAME}`,
    lead: "Usa tu cuenta de Discord o recibe un enlace de acceso por correo. No guardamos contraseñas.",
    discord: "Entrar con Discord",
    or: "o",
    leadDiscordOnly: "Entra con tu cuenta de Discord. No guardamos contraseñas.",
    emailOff: "Acceso por correo: no disponible todavía (pendiente de configurar el envío de correos).",
    emailLabel: "Correo electrónico",
    emailHint: "Te enviaremos un enlace de un solo uso. Tu correo no se muestra en tu perfil.",
    emailSubmit: "Enviarme el enlace",
    sent: "Enlace enviado. Revisa tu correo (y la carpeta de spam) y ábrelo en este navegador.",
    errors: {
      invalid_email: "Introduce un correo válido.",
      rate_limited: "Demasiados intentos. Espera unos minutos y vuelve a probar.",
      oauth: "No se pudo iniciar sesión con Discord. Inténtalo de nuevo.",
      callback: "El enlace no es válido o ha caducado. Pide uno nuevo.",
      session: "Tu sesión ya no es válida. Vuelve a entrar.",
      email_off: "El acceso por correo no está disponible todavía. Entra con Discord.",
      unknown: "Algo ha fallado. Inténtalo de nuevo.",
    },
  },
  dashboard: {
    title: (name: string) => `Hola, ${name}`,
    lead: "Tu cuenta está creada y la sesión es real.",
    profileTitle: "Tu perfil",
    riot: "Conectar cuenta Riot — integración pendiente",
  },
} as const;

export type ErrorCode = keyof typeof es.login.errors;

export function loginError(code: string | undefined): string | null {
  if (!code) return null;
  return code in es.login.errors ? es.login.errors[code as ErrorCode] : es.login.errors.unknown;
}
