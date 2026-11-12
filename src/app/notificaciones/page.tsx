import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { loadNames } from "@/lib/lobbies/queries";
import { notificationText } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";
import { markAllReadAction } from "./actions";

export const metadata: Metadata = { title: "Notificaciones", robots: { index: false } };

const when = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/entrar?next=/notificaciones");

  const { data } = await supabase
    .from("notifications")
    .select("id, kind, actor_id, lobby_id, clip_id, body, created_at, read_at")
    .order("created_at", { ascending: false })
    .limit(60);
  const list = data ?? [];
  const names = await loadNames(supabase, list.map((n) => n.actor_id).filter(Boolean) as string[]);
  const unread = list.filter((n) => !n.read_at).length;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Notificaciones</h1>
          <p className="text-muted">Se guardan 60 días. {unread > 0 ? `${unread} sin leer.` : "Todo leído."}</p>
        </div>
        {unread > 0 && (
          <form action={markAllReadAction}>
            <button type="submit" className="btn-ghost">
              Marcar todas como leídas
            </button>
          </form>
        )}
      </div>

      {list.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line p-6 text-center">
          <h2 className="font-semibold">Sin notificaciones</h2>
          <p className="mt-1 text-sm text-muted">Aquí verás las solicitudes a tus grupos, sus respuestas, comentarios en tus clips y más.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((n) => {
            const t = notificationText(n, n.actor_id ? (names.get(n.actor_id)?.name ?? "Alguien") : null);
            const content = (
              <>
                <span className="flex items-start justify-between gap-3">
                  <span className={n.read_at ? "" : "font-semibold"}>{t.title}</span>
                  <span className="shrink-0 text-xs text-muted">{when.format(new Date(n.created_at))}</span>
                </span>
                {t.detail && <span className="line-clamp-2 text-sm text-muted">{t.detail}</span>}
                {!n.read_at && <span className="sr-only">(sin leer)</span>}
              </>
            );
            const cls = `flex flex-col gap-1 surface p-4 ${n.read_at ? "" : "border-l-2 border-l-accent"}`;
            return (
              <li key={n.id}>
                {t.href ? (
                  <Link href={t.href} className={`${cls} hover:bg-panel-hover`}>
                    {content}
                  </Link>
                ) : (
                  <div className={cls}>{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
