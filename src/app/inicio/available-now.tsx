"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";
import { INTL_LOCALE } from "@/lib/i18n/locale";
import { setAvailableAction, type AvailableState } from "../disponible/actions";


/**
 * «¿Juegas ahora?»: te marcas disponible 1, 2 o 3 horas (y, si quieres, en qué modo). Quien busca jugadores puede
 * filtrar por los disponibles. Pasado ese tiempo deja de mostrarse solo.
 */
export function AvailableNow({
  until,
  mode,
  modes,
  gameName,
}: {
  until: string | null;
  mode: string | null;
  modes: { slug: string; name: string }[];
  gameName: string;
}) {
  const [state, action, pending] = useActionState<AvailableState, FormData>(setAvailableAction, null);
  const active = until && new Date(until) > new Date();
  const t = useTranslations("availableNow");
  const timeFmt = new Intl.DateTimeFormat(INTL_LOCALE[useLocale()], { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" });
  return (
    <section aria-labelledby="ahora" className={`surface flex flex-col gap-3 p-5 ${active ? "ring-1 ring-success" : ""}`}>
      <h2 id="ahora" className="flex items-center gap-2 font-semibold">
        {active && <span aria-hidden="true" className="live-dot" />}
        {active ? t("active") : t("question", { game: gameName })}
      </h2>
      {active ? (
        <form action={action} className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted">
            {t("until", { time: timeFmt.format(new Date(until)) })}
            {mode && ` · ${modes.find((m) => m.slug === mode)?.name ?? mode}`}. {t("seen")}
          </p>
          <button type="submit" name="hours" value="0" disabled={pending} className="btn-ghost">
            {t("stop")}
          </button>
        </form>
      ) : (
        <form action={action} className="flex flex-col gap-3">
          <p className="text-sm text-muted">{t("lead")}</p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">{t("mode")}</span>
              <select name="mode" defaultValue="" className="min-h-11 rounded-md border border-line bg-bg px-3 text-text focus:border-accent">
                <option value="">{t("anyMode")}</option>
                {modes.map((m) => (
                  <option key={m.slug} value={m.slug}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            {[1, 2, 3].map((h) => (
              <button key={h} type="submit" name="hours" value={h} disabled={pending} className={h === 1 ? "btn-primary" : "btn-ghost"}>
                {t("hours", { count: h })}
              </button>
            ))}
          </div>
        </form>
      )}
      <p role="status" aria-live="polite" className={`text-sm ${state?.ok ? "text-success" : "text-danger"}`}>
        {state?.message}
      </p>
    </section>
  );
}
