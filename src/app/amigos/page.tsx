import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { INTL_LOCALE } from "@/lib/i18n/locale";
import { titled } from "@/lib/i18n/metadata";
import { loadNames } from "@/lib/lobbies/queries";
import { siteUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { CopyInviteLink } from "./copy-link";

export const generateMetadata = titled("friends", { robots: { index: false } });

/** Invitar amigos: tu enlace personal y quién ha entrado con él (para invitarles a tus equipos). */
export default async function FriendsPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/entrar?next=/amigos");
  const [{ data: code }, { data: invitees }, t, locale] = await Promise.all([
    supabase.rpc("my_invite_code"),
    supabase.rpc("my_invitees"),
    getTranslations("invite"),
    getLocale(),
  ]);
  const list = invitees ?? [];
  const names = await loadNames(supabase, list.map((i) => i.user_id));
  const date = new Intl.DateTimeFormat(INTL_LOCALE[locale], { dateStyle: "medium", timeZone: "Europe/Madrid" });
  return (
    <section className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">{t("title")}</h1>
        <p className="text-muted">{t("lead")}</p>
      </div>
      <section aria-labelledby="enlace" className="surface hud flex flex-col gap-3 p-5">
        <h2 id="enlace" className="font-semibold">
          {t("linkTitle")}
        </h2>
        {code ? <CopyInviteLink url={`${siteUrl()}/invitar/${code}`} /> : <p className="text-sm text-danger">{t("error")}</p>}
        <p className="text-xs text-muted">{t("linkNote")}</p>
      </section>
      <section aria-labelledby="invitados" className="surface flex flex-col gap-3 p-5">
        <h2 id="invitados" className="font-semibold">
          {t("inviteesTitle", { count: list.length })}
        </h2>
        {list.length === 0 ? (
          <p className="text-sm text-muted">{t("none")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {list.map((i) => (
              <li key={i.user_id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm">
                  <span className="font-medium">{names.get(i.user_id)?.name ?? t("player")}</span>
                  <span className="text-muted"> · {t("joined", { date: date.format(new Date(i.joined_at)) })}</span>
                </span>
                <Link href={`/jugador/${i.user_id}`} className="btn-ghost">
                  {t("viewProfile")}
                </Link>
              </li>
            ))}
          </ul>
        )}
        {list.length > 0 && <p className="text-xs text-muted">{t("teamHint")}</p>}
      </section>
    </section>
  );
}
