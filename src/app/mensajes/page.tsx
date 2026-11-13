import { getLocale, getTranslations } from "next-intl/server";
import { INTL_LOCALE } from "@/lib/i18n/locale";
import { titled } from "@/lib/i18n/metadata";
import Link from "next/link";
import { redirect } from "next/navigation";
import { loadNames } from "@/lib/lobbies/queries";
import { loadCatalog } from "@/lib/profile/queries";
import { createClient } from "@/lib/supabase/server";

export const generateMetadata = titled("messages");

export default async function InboxPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const me = claims?.claims?.sub;
  if (!me) redirect("/entrar?next=/mensajes");

  const [{ data: rooms }, { data: convs }, catalog] = await Promise.all([
    supabase.rpc("my_rooms"),
    supabase.rpc("my_conversations"),
    loadCatalog(supabase),
  ]);
  const [t, locale] = await Promise.all([getTranslations("messages"), getLocale()]);
  const when = new Intl.DateTimeFormat(INTL_LOCALE[locale], { timeZone: "Europe/Madrid", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const list = rooms ?? [];
  const dms = (convs ?? []).filter((c) => !c.blocked);
  const names = await loadNames(supabase, [
    ...list.flatMap((r) => [r.owner_id, r.last_user_id].filter(Boolean) as string[]),
    ...dms.map((c) => c.other_id),
  ]);

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">{t("title")}</h1>
        <p className="text-muted">{t("lead")}</p>
      </div>

      <section aria-labelledby="privados" className="flex flex-col gap-3">
        <h2 id="privados" className="font-semibold">
          {t("private")}
        </h2>
        {dms.length === 0 ? (
          <p className="text-sm text-muted">
            {t("noPrivate")}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {dms.map((c) => (
              <li key={c.conversation_id}>
                <Link href={`/mensajes/${c.conversation_id}`} className="flex items-center gap-4 surface p-4 hover:bg-panel-hover">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{names.get(c.other_id)?.name ?? t("player")}</p>
                    <p className="truncate text-sm text-muted">
                      {c.last_sender === me ? `${t("you")}: ` : ""}
                      {c.last_body}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {c.last_at && <span className="text-xs text-muted">{when.format(new Date(c.last_at))}</span>}
                    {Number(c.unread) > 0 && (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-bg">
                        {c.unread} <span className="sr-only">{t("unread")}</span>
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <h2 className="font-semibold">{t("rooms")}</h2>

      {list.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line p-6 text-center">
          <h3 className="font-semibold">{t("noRooms")}</h3>
          <p className="mt-1 text-sm text-muted">{t("noRoomsText")}</p>
          <Link href="/grupos" className="mt-3 btn-ghost">
            {t("seeLobbies")}
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((r) => {
            const mode = catalog.modes.find((m) => m.slug === r.mode_slug)?.name ?? r.mode_slug;
            const owner = names.get(r.owner_id)?.name ?? t("player");
            const who = r.last_user_id === me ? t("you") : (names.get(r.last_user_id ?? "")?.name ?? t("player"));
            return (
              <li key={r.lobby_id}>
                <Link
                  href={`/grupos/${r.lobby_id}`}
                  className="flex items-center gap-4 surface p-4 hover:bg-panel-hover"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {r.owner_id === me ? t("roomOfYou", { mode }) : t("roomOf", { mode, owner })}
                      {r.status === "full" && <span className="ml-2 text-xs font-normal text-muted">{t("full")}</span>}
                    </p>
                    <p className="truncate text-sm text-muted">{r.last_body ? `${who}: ${r.last_body}` : t("noMessages")}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {r.last_at && <span className="text-xs text-muted">{when.format(new Date(r.last_at))}</span>}
                    {Number(r.unread) > 0 && (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-bg">
                        {r.unread} <span className="sr-only">{t("unread")}</span>
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
