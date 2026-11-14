import type { Database } from "./supabase/database.types";

export type NotificationKind = Database["public"]["Enums"]["notification_kind"];

export type NotificationLike = {
  kind: NotificationKind;
  lobby_id: string | null;
  clip_id: string | null;
  body: string | null;
  team_id?: string | null;
  actor_id?: string | null;
};

/**
 * Enlace y detalle de cada notificación, sin textos (sirve también en el cliente). El título está en
 * messages/*.json (notifications.title.<kind>); el detalle (`body`) lo escribe la base de datos y no se traduce.
 */
export function notificationLink(n: NotificationLike): { detail: string | null; href: string | null } {
  const lobby = n.lobby_id ? `/grupos/${n.lobby_id}` : null;
  const team = n.team_id ? `/equipo/${n.team_id}` : "/mis-equipos";
  switch (n.kind) {
    case "join_request":
      return { detail: n.body, href: lobby };
    case "request_accepted":
    case "request_rejected":
      return { detail: null, href: lobby };
    case "clip_comment":
      return { detail: n.body, href: n.clip_id ? `/clips/${n.clip_id}` : null };
    case "karma":
      return { detail: null, href: "/perfil" };
    case "restriction":
      return { detail: n.body, href: "/normas" };
    case "fanart":
      return { detail: n.body, href: "/coleccion/fanart" };
    case "ranking":
      return { detail: n.body, href: "/ranking" };
    case "team_invite":
      return { detail: n.body, href: "/mis-equipos" };
    case "team_joined":
    case "team_event":
      return { detail: n.body, href: team };
    case "team_lobby":
      return { detail: n.body, href: lobby ?? "/mis-equipos" };
    case "friend_joined":
      return { detail: null, href: "/amigos" };
    case "karma_reminder":
    case "lobby_starting":
      return { detail: null, href: lobby };
    case "search_match":
      // El detalle es el nombre de la búsqueda guardada.
      return { detail: n.body, href: n.actor_id ? `/jugador/${n.actor_id}` : "/buscar?now=1" };
  }
}
