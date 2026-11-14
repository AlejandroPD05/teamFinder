"use client";

import { Check, Copy, Megaphone, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
import { postLobbyDiscordAction, shareLobbyAction, type DiscordState, type ShareState } from "../actions";

/**
 * Compartir el grupo fuera de la web: crea un enlace público con el resumen del grupo (modo, plazas, roles que
 * faltan, rango…) y una tarjeta de vista previa para Discord. Quien lo abra tiene que entrar para pedir unirse.
 */
/** «available»: integración conectada y aún sin publicar; «posted»: ya publicado; null: no conectada (no se enseña). */
type DiscordStatus = "available" | "posted" | null;

export function ShareLobby({ lobbyId, sharedUrl, discord }: { lobbyId: string; sharedUrl: string | null; discord: DiscordStatus }) {
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
      {url && discord && <PostToDiscord lobbyId={lobbyId} posted={discord === "posted"} />}
    </section>
  );
}

/** Publicar el grupo en el canal de Discord de TeamFinder: solo a petición del creador y una vez por grupo. */
function PostToDiscord({ lobbyId, posted }: { lobbyId: string; posted: boolean }) {
  const [state, action, pending] = useActionState<DiscordState, FormData>(postLobbyDiscordAction, null);
  const t = useTranslations("share.discord");
  const done = posted || state?.ok;
  return (
    <div className="flex flex-col gap-2 border-t border-line pt-3">
      <p className="text-sm text-muted">{t("lead")}</p>
      {done ? (
        <p className="inline-flex items-center gap-2 text-sm text-success">
          <Check aria-hidden="true" className="size-4" />
          {t("posted")}
        </p>
      ) : (
        <form action={action}>
          <input type="hidden" name="lobby_id" value={lobbyId} />
          <button type="submit" disabled={pending} className="btn-ghost">
            <Megaphone aria-hidden="true" className="size-4" />
            {t("post")}
          </button>
        </form>
      )}
      <p role="status" aria-live="polite" className={`text-sm ${state && !state.ok ? "text-danger" : "sr-only"}`}>
        {state && !state.ok ? state.message : state?.ok ? t("posted") : ""}
      </p>
    </div>
  );
}
