import { getLocale, getTranslations } from "next-intl/server";
import { INTL_LOCALE } from "@/lib/i18n/locale";
import { titled } from "@/lib/i18n/metadata";
import Link from "next/link";
import { redirect } from "next/navigation";
import { loadNames } from "@/lib/lobbies/queries";
import { notificationText } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";
import { markAllReadAction } from "./actions";

export const generateMetadata = titled("notifications", { robots: { index: false } });

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/entrar?next=/notificaciones");

  const { data } = await supabase
    .from("notifications")
    .select("id, kind, actor_id, lobby_id, clip_id, team_id, body, created_at, read_at")
    .order("created_at", { ascending: false })
    .limit(60);
  const list = data ?? [];
  const names = await loadNames(supabase, list.map((n) => n.actor_id).filter(Boolean) as string[]);
  const unread = list.filter((n) => !n.read_at).length;
  const [tp, tn, locale] = await Promise.all([getTranslations("notificationsPage"), getTranslations("notifications"), getLocale()]);
  const when = new Intl.DateTimeFormat(INTL_LOCALE[locale], { timeZone: "Europe/Madrid", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">{tp("title")}</h1>
          <p className="text-muted">{tp("kept")} {unread > 0 ? tp("unread", { count: unread }) : tp("allRead")}</p>
        </div>
        {unread > 0 && (
          <form action={markAllReadAction}>
            <button type="submit" className="btn-ghost">
              {tp("markAll")}
            </button>
          </form>
        )}
      </div>

      {list.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line p-6 text-center">
          <h2 className="font-semibold">{tp("empty")}</h2>
          <p className="mt-1 text-sm text-muted">{tp("emptyText")}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((n) => {
            const t = notificationText(n, n.actor_id ? (names.get(n.actor_id)?.name ?? tn("someone")) : null, locale);
            const content = (
              <>
                <span className="flex items-start justify-between gap-3">
                  <span className={n.read_at ? "" : "font-semibold"}>{t.title}</span>
                  <span className="shrink-0 text-xs text-muted">{when.format(new Date(n.created_at))}</span>
                </span>
                {t.detail && <span className="line-clamp-2 text-sm text-muted">{t.detail}</span>}
                {!n.read_at && <span className="sr-only">{tp("unreadMark")}</span>}
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
