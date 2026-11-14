import type { AppLocale } from "@/lib/i18n/locale";

// Novedades de la web (/novedades): solo cambios visibles para quien la usa, ya publicados, en los dos idiomas.
// Fechas = día en que llegó a la web (fecha del commit en main). Al publicar algo nuevo, se añade aquí.

export type ChangelogEntry = {
  /** Día en formato AAAA-MM-DD. */
  date: string;
  items: Record<AppLocale, string>[];
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-11-14",
    items: [
      {
        es: "«Te pueden encajar»: en Inicio, jugadores con varias cosas en común contigo y el motivo de cada uno.",
        en: "“Players who might fit”: on your dashboard, players with several things in common with you and why.",
      },
      {
        es: "Fiabilidad en el perfil: qué parte de sus grupos termina cada jugador y cuánto tarda en responder (últimos 90 días).",
        en: "Reliability on profiles: how many of their groups each player finishes and how fast they answer (last 90 days).",
      },
      {
        es: "Grupo en un clic: guarda un grupo como plantilla o repite el último.",
        en: "One-click groups: save a group as a template or repeat your last one.",
      },
      {
        es: "Horario del equipo: mira cuándo podéis jugar más miembros a la vez.",
        en: "Team schedule: see when most members can play at the same time.",
      },
      {
        es: "Tarjeta para compartir tu perfil (se activa a mano), invitar amigos con tu enlace y buzón de sugerencias.",
        en: "A shareable profile card (opt-in), inviting friends with your link, and a feedback inbox.",
      },
    ],
  },
  {
    date: "2026-11-13",
    items: [
      {
        es: "Páginas públicas por rol en cada juego (por ejemplo, «Busco Controlador en VALORANT») y esta página de novedades.",
        en: "Public pages for each role in every game (for example, “Looking for a Controlador in VALORANT”) and this “What's new” page.",
      },
      {
        es: "La web está también en inglés: elige el idioma en el pie de página.",
        en: "The site is now available in English: pick your language in the footer.",
      },
      {
        es: "«Disponible ahora»: márcate disponible de 1 a 3 horas, filtra la búsqueda por quien puede jugar ya y mira cuántos hay en la portada.",
        en: "“Available now”: mark yourself available for 1 to 3 hours, filter search by who can play right now and see how many there are on the home page.",
      },
      {
        es: "Comparte tus grupos en Discord con un enlace y una vista previa; para unirse hay que entrar en la web.",
        en: "Share your groups on Discord with a link and a preview card; joining still requires signing in.",
      },
      {
        es: "Quedadas de equipo: propón día y hora, cada miembro responde y se crea el grupo con quienes van.",
        en: "Team meetups: suggest a day and time, each member replies and a group is created with those who are going.",
      },
      {
        es: "Guía de bienvenida para las cuentas nuevas: juego, rol y rango en tres pasos.",
        en: "Welcome guide for new accounts: game, role and rank in three steps.",
      },
      {
        es: "La web se puede instalar como app y avisarte con notificaciones push (si las activas en Ajustes).",
        en: "The site can be installed as an app and send you push notifications (if you turn them on in Settings).",
      },
      {
        es: "Equipos persistentes con su propio chat, registro manual de partidas y avisos por correo opcionales.",
        en: "Persistent teams with their own chat, a manual match log and optional email notifications.",
      },
      {
        es: "Ranking semanal de compañerismo por juego, con insignias permanentes para el Top 10.",
        en: "Weekly teamwork ranking for each game, with permanent badges for the Top 10.",
      },
      {
        es: "Normas y política de privacidad definitivas (versión 1.0).",
        en: "Final community rules and privacy policy (version 1.0).",
      },
    ],
  },
  {
    date: "2026-11-12",
    items: [
      {
        es: "Mensajes privados entre jugadores, con opción de no recibirlos.",
        en: "Private messages between players, with the option to turn them off.",
      },
      {
        es: "Notificaciones dentro de la web: solicitudes a tus grupos, comentarios en tus clips y reconocimientos.",
        en: "In-site notifications: requests to your groups, comments on your clips and recognitions.",
      },
      {
        es: "Enlaces a tus redes (Twitch, YouTube y X) e insignias en el perfil.",
        en: "Links to your social profiles (Twitch, YouTube and X) and badges on your profile.",
      },
      {
        es: "Ganadores semanales de Clip Zone, también anunciados en Discord.",
        en: "Weekly Clip Zone winners, also announced on Discord.",
      },
      {
        es: "Fanart de la comunidad como cartas coleccionables, siempre con permiso del artista, y cartas de CS2 con arte propio.",
        en: "Community fanart as collectible cards, always with the artist's permission, and CS2 cards with original art.",
      },
      {
        es: "Nuevo aspecto con más profundidad, iconos propios para cada juego y un icono de la web con el color del juego elegido.",
        en: "A new look with more depth, our own icon for each game and a site icon in the colour of the selected game.",
      },
      {
        es: "Normas de la comunidad y política de privacidad completas.",
        en: "Complete community rules and privacy policy.",
      },
    ],
  },
  {
    date: "2026-11-11",
    items: [
      {
        es: "Clip Zone: comparte clips de YouTube, Twitch o Streamable, comenta y da emblemas a las mejores jugadas.",
        en: "Clip Zone: share clips from YouTube, Twitch or Streamable, comment and give emblems to the best plays.",
      },
    ],
  },
  {
    date: "2026-11-06",
    items: [
      {
        es: "Misiones y cartas coleccionables: completa grupos y consigue cartas de tu juego.",
        en: "Missions and collectible cards: complete groups and earn cards for your game.",
      },
      {
        es: "Selector de juego en la portada con el número de jugadores de cada uno.",
        en: "Game picker on the home page showing how many players each game has.",
      },
    ],
  },
  {
    date: "2026-11-05",
    items: [
      {
        es: "Llegan Counter-Strike 2 y Apex Legends, cada uno con sus roles, rangos, modos y colores.",
        en: "Counter-Strike 2 and Apex Legends arrive, each with its own roles, ranks, modes and colours.",
      },
      {
        es: "Página pública para cada juego y una demo con datos ficticios para ver la web sin cuenta.",
        en: "A public page for each game and a demo with fictional data to try the site without an account.",
      },
      {
        es: "Iconos de agentes, rangos y leyendas.",
        en: "Agent, rank and legend icons.",
      },
      {
        es: "El karma pasa a ser solo positivo: reconocimientos a los compañeros con los que has jugado.",
        en: "Karma becomes positive only: recognitions for the teammates you've played with.",
      },
    ],
  },
  {
    date: "2026-11-04",
    items: [
      {
        es: "Abre la beta: entrada con Discord, perfil con visibilidad por campo, búsqueda de jugadores con filtros, grupos con solicitudes y chat de sala en tiempo real.",
        en: "The beta opens: Discord sign-in, profiles with per-field visibility, player search with filters, groups with join requests and real-time group chat.",
      },
      {
        es: "Bloqueo, denuncias, moderación, karma y borrado de cuenta.",
        en: "Blocking, reporting, moderation, karma and account deletion.",
      },
    ],
  },
];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Fecha AAAA-MM-DD que existe en el calendario. */
export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Entradas de la más reciente a la más antigua (sin tocar la lista original). */
export function newestFirst(entries: ChangelogEntry[]): ChangelogEntry[] {
  return [...entries].sort((a, b) => b.date.localeCompare(a.date));
}

/** Fecha larga en el idioma de la petición (el día no depende de la zona horaria del servidor). */
export function formatChangelogDate(date: string, intlLocale: string): string {
  return new Intl.DateTimeFormat(intlLocale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}
