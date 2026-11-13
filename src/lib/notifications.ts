import type { Database } from "./supabase/database.types";

type Kind = Database["public"]["Enums"]["notification_kind"];

type Notification = {
  kind: Kind;
  lobby_id: string | null;
  clip_id: string | null;
  body: string | null;
};

/** Texto y enlace de cada notificación. `actor` es el nombre visible de quien la provoca (null si no se dice). */
export function notificationText(n: Notification, actor: string | null): { title: string; detail: string | null; href: string | null } {
  const who = actor ?? "Alguien";
  const lobby = n.lobby_id ? `/grupos/${n.lobby_id}` : null;
  switch (n.kind) {
    case "join_request":
      return { title: `${who} quiere unirse a tu grupo`, detail: n.body, href: lobby };
    case "request_accepted":
      return { title: "Te han aceptado en un grupo", detail: null, href: lobby };
    case "request_rejected":
      return { title: "No te han aceptado en un grupo", detail: null, href: lobby };
    case "clip_comment":
      return { title: `${who} ha comentado tu clip`, detail: n.body, href: n.clip_id ? `/clips/${n.clip_id}` : null };
    case "karma":
      return { title: "Un compañero te ha dado un reconocimiento", detail: null, href: "/perfil" };
    case "restriction":
      return { title: "Tu cuenta está restringida temporalmente", detail: n.body, href: "/normas" };
    case "fanart":
      return { title: "Novedades sobre tu fanart", detail: n.body, href: "/coleccion/fanart" };
    case "ranking":
      return { title: "¡Estás en el Top 10 semanal!", detail: n.body, href: "/ranking" };
  }
}
