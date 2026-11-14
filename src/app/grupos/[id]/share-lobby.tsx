"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
import { shareLobbyAction, type ShareState } from "../actions";

/**
 * Compartir el grupo fuera de la web: crea un enlace público con el resumen del grupo (modo, plazas, roles que
 * faltan, rango…) y una tarjeta de vista previa para Discord. Quien lo abra tiene que entrar para pedir unirse.
 */
export function ShareLobby({ lobbyId, sharedUrl }: { lobbyId: string; sharedUrl: string | null }) {
  const [state, action, pending] = useActionState<ShareState, FormData>(shareLobbyAction, null);
  const url = state?.ok ? state.url : sharedUrl;
  const [copied, setCopied] = useState(false);
  const t = useTranslations("share");

  // Al generar el enlace, se copia solo.
  useEffect(() => {
    if (!state?.ok) return;
    void navigator.clipboard?.writeText(state.url).then(() => setCopied(true), () => {});
  }, [state]);

  return (
    <section aria-labelledby="compartir" className="surface flex flex-col gap-3 p-5">
      <h2 id="compartir" className="font-semibold">
        {t("title")}
      </h2>
      <p className="text-sm text-muted">{t("lead")}</p>
      {url ? (
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="share-url" className="sr-only">
            {t("label")}
          </label>
          <input id="share-url" readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="min-h-11 min-w-0 flex-1 rounded-md border border-line bg-bg px-3 text-sm" />
          <button
            type="button"
            onClick={() => void navigator.clipboard?.writeText(url).then(() => setCopied(true), () => {})}
            className="btn-ghost"
          >
            {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
            {copied ? t("copied") : t("copy")}
          </button>
          <span role="status" className="sr-only">
            {copied ? t("copied") : ""}
          </span>
        </div>
      ) : (
        <form action={action}>
          <input type="hidden" name="lobby_id" value={lobbyId} />
          <button type="submit" disabled={pending} className="btn-ghost">
            <Share2 aria-hidden="true" className="size-4" />
            {t("create")}
          </button>
        </form>
      )}
      {state && !state.ok && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}
    </section>
  );
}
