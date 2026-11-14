import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { pct, type AdminStats } from "@/lib/admin-stats";
import { INTL_LOCALE } from "@/lib/i18n/locale";
import { titled } from "@/lib/i18n/metadata";
import { createClient } from "@/lib/supabase/server";

export const generateMetadata = titled("stats", { robots: { index: false } });

function Stat({ label, value, note }: { label: string; value: string; note?: string | null }) {
  return (
    <div className="surface flex flex-col gap-1 p-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-display text-2xl font-semibold tabular-nums">{value}</dd>
      {note && <dd className="text-xs text-muted">{note}</dd>}
    </div>
  );
}

/** Estadísticas para moderación: solo recuentos agregados, para saber qué funciona. */
export default async function StatsPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/entrar?next=/moderacion/estadisticas");
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) notFound(); // no revelar que existe
  const [{ data }, t, locale] = await Promise.all([supabase.rpc("admin_stats"), getTranslations("stats"), getLocale()]);
  const s = data as AdminStats | null;
  if (!s) notFound();
  const n = new Intl.NumberFormat(INTL_LOCALE[locale]);
  const filled = pct(s.filled_30d, s.lobbies_30d);
  const onboarded = pct(s.onboarded, s.users);

  return (
    <section className="flex flex-col gap-6">
      <div>
        <Link href="/moderacion" className="inline-flex min-h-11 items-center text-sm text-muted hover:text-text">
          ← {t("back")}
        </Link>
        <h1 className="font-display text-3xl font-semibold">{t("title")}</h1>
        <p className="text-muted">{t("lead")}</p>
      </div>

      <section aria-labelledby="st-personas" className="flex flex-col gap-3">
        <h2 id="st-personas" className="font-display text-xl font-semibold">
          {t("people")}
        </h2>
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label={t("users")} value={n.format(s.users)} note={t("newUsers", { week: n.format(s.users_7d), month: n.format(s.users_30d) })} />
          <Stat label={t("active")} value={n.format(s.active_7d)} note={t("activeNote")} />
          <Stat label={t("onboarded")} value={onboarded == null ? "—" : `${onboarded} %`} note={t("onboardedNote")} />
          <Stat label={t("reach")} value={n.format(s.push_users)} note={t("reachNote", { email: n.format(s.email_users) })} />
        </dl>
      </section>

      <section aria-labelledby="st-grupos" className="flex flex-col gap-3">
        <h2 id="st-grupos" className="font-display text-xl font-semibold">
          {t("groups")}
        </h2>
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label={t("lobbies")} value={n.format(s.lobbies_30d)} note={t("lobbiesNote", { week: n.format(s.lobbies_7d) })} />
          <Stat label={t("filled")} value={filled == null ? "—" : `${filled} %`} note={t("filledNote", { count: n.format(s.filled_30d) })} />
          <Stat label={t("requests")} value={n.format(s.requests_30d)} note={t("last30")} />
          <Stat label={t("karma")} value={n.format(s.karma_30d)} note={t("last30")} />
        </dl>
      </section>

      <section aria-labelledby="st-comunidad" className="flex flex-col gap-3">
        <h2 id="st-comunidad" className="font-display text-xl font-semibold">
          {t("community")}
        </h2>
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label={t("teams")} value={n.format(s.teams)} />
          <Stat label={t("clips")} value={n.format(s.clips_30d)} note={t("last30")} />
          <Stat label={t("messages")} value={n.format(s.messages_7d)} note={t("last7")} />
          <Stat label={t("savedSearches")} value={n.format(s.saved_searches)} />
        </dl>
        {s.feedback_new > 0 && (
          <p className="text-sm">
            <Link href="/moderacion#sugerencias" className="underline underline-offset-4">
              {t("feedback", { count: s.feedback_new })}
            </Link>
          </p>
        )}
      </section>

      <section aria-labelledby="st-juegos" className="flex flex-col gap-3">
        <h2 id="st-juegos" className="font-display text-xl font-semibold">
          {t("byGame")}
        </h2>
        <table className="surface w-full text-sm">
          <caption className="sr-only">{t("byGame")}</caption>
          <thead>
            <tr className="text-left text-muted">
              <th scope="col" className="p-3 font-normal">{t("game")}</th>
              <th scope="col" className="p-3 text-right font-normal">{t("profiles")}</th>
              <th scope="col" className="p-3 text-right font-normal">{t("lobbies30")}</th>
            </tr>
          </thead>
          <tbody>
            {s.games.map((g) => (
              <tr key={g.game_id} className="border-t border-line">
                <th scope="row" className="p-3 text-left font-medium">{g.name}</th>
                <td className="p-3 text-right tabular-nums">{n.format(g.profiles)}</td>
                <td className="p-3 text-right tabular-nums">{n.format(g.lobbies_30d)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <p className="text-xs text-muted">{t("privacy")}</p>
    </section>
  );
}
