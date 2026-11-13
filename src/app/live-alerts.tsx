"use client";

import { Bell, MessageSquare, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { notificationLink } from "@/lib/notification-links";
import type { Database } from "@/lib/supabase/database.types";
import { browserClient } from "@/lib/supabase/client";

type Alert = { id: string; kind: "dm" | "note"; title: string; detail: string | null; href: string | null };
type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];
type DirectMessageRow = Database["public"]["Tables"]["direct_messages"]["Row"];

const VISIBLE_MS = 6000;

/**
 * Avisos en directo («isla» que se despliega arriba): notificaciones nuevas y mensajes privados que llegan mientras
 * se usa la web. Realtime solo entrega a cada cual lo suyo (RLS). Al llegar algo, se refrescan los contadores de la
 * cabecera (que ruedan) sin recargar la página.
 */
export function LiveAlerts({ me }: { me: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  const [alert, setAlert] = useState<Alert | null>(null);
  const [open, setOpen] = useState(false);
  const t = useTranslations("liveAlerts");
  const tn = useTranslations("notifications");
  // Los textos se leen dentro del efecto (suscripción de Realtime) sin volver a suscribirse al cambiar de idioma.
  const text = useRef({ t, tn });
  useEffect(() => {
    text.current = { t, tn };
  }, [t, tn]);

  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const supabase = browserClient();
    let cancelled = false;
    const names = new Map<string, string>();
    const nameOf = async (id: string | null) => {
      if (!id) return null;
      if (!names.has(id)) {
        const { data } = await supabase.from("profile_cards").select("display_name").eq("id", id).maybeSingle();
        names.set(id, data?.display_name ?? text.current.tn("someone"));
      }
      return names.get(id)!;
    };
    const show = (a: Alert) => {
      // Se monta recogida y se despliega en el siguiente fotograma, para que se vea la transición.
      setOpen(false);
      setAlert(a);
      requestAnimationFrame(() => requestAnimationFrame(() => setOpen(true)));
      router.refresh();
    };

    const channel = supabase.channel(`alerts:${me}`);
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) supabase.realtime.setAuth(data.session.access_token);
      if (cancelled) return;
      channel
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${me}` },
          async (payload) => {
            const n = payload.new as NotificationRow;
            const who = (await nameOf(n.actor_id)) ?? text.current.tn("someone");
            show({ id: `n${n.id}`, kind: "note", title: text.current.tn(`title.${n.kind}`, { who }), ...notificationLink(n) });
          },
        )
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, async (payload) => {
          const m = payload.new as DirectMessageRow;
          const href = `/mensajes/${m.conversation_id}`;
          // Lo mío no se avisa, ni lo que ya estoy leyendo en esa conversación.
          if (m.sender_id === me || pathRef.current === href) return;
          show({ id: `m${m.id}`, kind: "dm", title: text.current.t("messageFrom", { name: (await nameOf(m.sender_id)) ?? "" }), detail: m.body, href });
        })
        .subscribe();
    })();
    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [me, router]);

  // Se recoge sola pasado un rato.
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => setOpen(false), VISIBLE_MS);
    return () => clearTimeout(id);
  }, [open, alert?.id]);

  const Icon = alert?.kind === "dm" ? MessageSquare : Bell;
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-4">
      {alert && (
        <div key={alert.id} data-open={open || undefined} inert={!open} className="island pointer-events-auto flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-bg">
            <Icon aria-hidden="true" className="size-4" />
          </span>
          {alert.href ? (
            <Link href={alert.href} onClick={() => setOpen(false)} className="island-body min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{alert.title}</span>
              {alert.detail && <span className="block truncate text-xs text-muted">{alert.detail}</span>}
            </Link>
          ) : (
            <span className="island-body min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{alert.title}</span>
              {alert.detail && <span className="block truncate text-xs text-muted">{alert.detail}</span>}
            </span>
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t("close")}
            className="island-body inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:text-text"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
