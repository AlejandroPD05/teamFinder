"use client";

import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { shareCardAction, type CardState } from "../../tarjeta/actions";

/**
 * Tarjeta para compartir el perfil fuera de la web (Discord, redes). Opt-in: viene desactivada y solo enseña lo que
 * ya es público (nombre, rango, roles y mains de ese juego); si el perfil del juego no es público, no se ve.
 */
export function ShareCardLink({ enabled, url, gamePublic }: { enabled: boolean; url: string; gamePublic: boolean }) {
  const [state, action, pending] = useActionState<CardState, FormData>(shareCardAction, null);
  const on = state?.ok ? state.enabled : enabled;
  const [copied, setCopied] = useState(false);
  const t = useTranslations("playerShare");
  return (
    <section aria-labelledby="tarjeta" className="surface flex flex-col gap-3 p-5">
      <h2 id="tarjeta" className="font-semibold">
        {t("title")}
      </h2>
      <p className="text-sm text-muted">{t("lead")}</p>
      {on && !gamePublic && <p className="text-sm text-warning">{t("notPublic")}</p>}
      {on && gamePublic && (
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="card-url" className="sr-only">
            {t("label")}
          </label>
          <input id="card-url" readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="min-h-11 min-w-0 flex-1 rounded-md border border-line bg-bg px-3 text-sm" />
          <button
            type="button"
            onClick={() => void navigator.clipboard?.writeText(url).then(() => setCopied(true), () => {})}
            className="btn-ghost"
          >
            {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
            {copied ? t("copied") : t("copy")}
          </button>
        </div>
      )}
      <form action={action}>
        <input type="hidden" name="enabled" value={on ? "off" : "on"} />
        <button type="submit" disabled={pending} className="btn-ghost">
          {on ? t("disable") : t("enable")}
        </button>
      </form>
      {state && !state.ok && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}
    </section>
  );
}
