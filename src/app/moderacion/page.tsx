import { getLocale, getTranslations } from "next-intl/server";
import { INTL_LOCALE } from "@/lib/i18n/locale";
import { titled } from "@/lib/i18n/metadata";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { loadNames } from "@/lib/lobbies/queries";
import { createClient } from "@/lib/supabase/server";
import { LiftRestrictionButton, ResolveForm, RestrictForm } from "../confianza/forms";
import { ReviewFanart } from "../coleccion/fanart/forms";
import { FeedbackStatus } from "../sugerencias/forms";

export const generateMetadata = titled("moderation", { robots: { index: false } });

export default async function ModerationPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/entrar?next=/moderacion");
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) notFound(); // no revelar que existe

  const { data: reports } = await supabase
    .from("reports")
    .select("id, target_user_id, reporter_id, reason, details, message_snapshot, lobby_id, clip_id, clip_comment_id, direct_message_id, created_at")
    .eq("status", "open")
    .order("created_at")
    .limit(100);
  const list = reports ?? [];
  const [{ data: restrictions }, { data: fanart }, { data: feedback }] = await Promise.all([
    supabase
      .from("user_restrictions")
      .select("id, user_id, until, reason")
      .is("lifted_at", null)
      .gt("until", new Date().toISOString())
      .order("until"),
    supabase
      .from("fanart_submissions")
      .select("id, user_id, game_id, title, artist_name, portfolio_url, image_path, created_at")
      .eq("status", "pending")
      .order("created_at")
      .limit(50),
    supabase.from("feedback").select("id, kind, body, page, status, created_at").order("status").order("created_at", { ascending: false }).limit(50),
  ]);
  const names = await loadNames(supabase, [
    ...(list.map((r) => r.target_user_id).filter(Boolean) as string[]),
    ...(restrictions ?? []).map((r) => r.user_id),
    ...(fanart ?? []).map((f) => f.user_id),
  ]);
  const [t, to, tf, locale] = await Promise.all([getTranslations("moderation"), getTranslations("options.reportReasons"), getTranslations("feedback"), getLocale()]);
  const when = new Intl.DateTimeFormat(INTL_LOCALE[locale], { timeZone: "Europe/Madrid", dateStyle: "medium", timeStyle: "short" });
  const fanartUrl = (path: string) => supabase.storage.from("fanart").getPublicUrl(path).data.publicUrl;

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">{t("title")}</h1>
        <p className="text-muted">{t("lead")}</p>
      </div>
      {list.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-6 text-center text-muted">{t("none")}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {list.map((r) => (
            <li key={r.id} className="flex flex-col gap-3 surface p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-semibold">{to(r.reason)}</h2>
                <span className="text-xs text-muted">{when.format(new Date(r.created_at))}</span>
              </div>
              <p className="text-sm">
                {t("reported")}{" "}
                {r.target_user_id ? (
                  <Link href={`/jugador/${r.target_user_id}`} className="underline underline-offset-4">
                    {names.get(r.target_user_id)?.name ?? t("player")}
                  </Link>
                ) : (
                  <span className="text-muted">{t("deletedAccount")}</span>
                )}
                {r.clip_id && (
                  <>
                    {" "}
                    · {t("in")}{" "}
                    <Link href={`/clips/${r.clip_id}`} className="underline underline-offset-4">
                      {r.clip_comment_id ? t("aClipComment") : t("aClip")}
                    </Link>{" "}
                    {t("canHide")}
                  </>
                )}
                {r.lobby_id && (
                  <>
                    {" "}
                    · {t("in")}{" "}
                    <Link href={`/grupos/${r.lobby_id}`} className="underline underline-offset-4">
                      {t("aLobby")}
                    </Link>
                  </>
                )}
              </p>
              {r.message_snapshot && (
                <blockquote className="rounded border-l-2 border-danger bg-bg px-3 py-2 text-sm">«{r.message_snapshot}»</blockquote>
              )}
              {r.details && <p className="text-sm text-muted">{t("details", { details: r.details })}</p>}
              {r.direct_message_id && <p className="text-xs text-muted">{t("inDm")}</p>}
              {r.target_user_id && <RestrictForm userId={r.target_user_id} reportId={r.id} />}
              <ResolveForm reportId={r.id} />
            </li>
          ))}
        </ul>
      )}

      <section aria-labelledby="restricciones" className="flex flex-col gap-3">
        <h2 id="restricciones" className="font-display text-xl font-semibold">
          {t("restrictions")}
        </h2>
        {!restrictions?.length ? (
          <p className="text-sm text-muted">{t("noRestrictions")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {restrictions.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 surface p-4">
                <div className="text-sm">
                  <Link href={`/jugador/${r.user_id}`} className="font-semibold underline underline-offset-4">
                    {names.get(r.user_id)?.name ?? t("player")}
                  </Link>{" "}
                  {t("until", { date: when.format(new Date(r.until)) })}
                  <p className="text-muted">{t("reason", { reason: r.reason })}</p>
                </div>
                <LiftRestrictionButton restrictionId={r.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="fanart" className="flex flex-col gap-3">
        <h2 id="fanart" className="font-display text-xl font-semibold">
          {t("fanart")}
        </h2>
        {!fanart?.length ? (
          <p className="text-sm text-muted">{t("noFanart")}</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {fanart.map((f) => (
              <li key={f.id} className="grid gap-4 surface p-5 sm:grid-cols-[10rem_1fr]">
                {/* eslint-disable-next-line @next/next/no-img-element -- vista previa sin optimizar de una subida pendiente */}
                <img src={fanartUrl(f.image_path)} alt={t("fanartAlt", { title: f.title })} className="aspect-[3/4] w-40 rounded-md object-cover" />
                <div className="flex flex-col gap-2">
                  <p className="font-semibold">{f.title}</p>
                  <p className="text-sm text-muted">
                    {f.game_id} · {t("byArtist", { artist: f.artist_name })} ({t("account")}{" "}
                    <Link href={`/jugador/${f.user_id}`} className="underline underline-offset-4">
                      {names.get(f.user_id)?.name ?? t("player")}
                    </Link>
                    ) · {when.format(new Date(f.created_at))}
                  </p>
                  {f.portfolio_url && (
                    <a href={f.portfolio_url} rel="noopener noreferrer nofollow" target="_blank" className="text-sm underline underline-offset-4">
                      {t("portfolio")}
                    </a>
                  )}
                  <p className="text-xs text-muted">{t("check")}</p>
                  <ReviewFanart id={f.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="sugerencias" className="flex flex-col gap-3">
        <h2 id="sugerencias" className="font-display text-xl font-semibold">
          {t("feedback")}
        </h2>
        {!feedback?.length ? (
          <p className="text-sm text-muted">{t("noFeedback")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {feedback.map((f) => (
              <li key={f.id} className={`surface flex flex-col gap-2 p-5 ${f.status === "done" ? "opacity-70" : ""}`}>
                <p className="text-sm text-muted">
                  {tf(`kind.${f.kind as "idea" | "bug" | "other"}`)} · {when.format(new Date(f.created_at))}
                  {f.page && <> · {f.page}</>}
                  {f.status === "done" && <> · {tf("done")}</>}
                </p>
                <p className="whitespace-pre-line text-sm">{f.body}</p>
                <FeedbackStatus id={f.id} status={f.status as "new" | "done"} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
