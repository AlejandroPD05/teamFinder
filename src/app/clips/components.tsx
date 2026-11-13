"use client";

import { Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef, useState } from "react";
import { optionKeys } from "@/lib/profile/options";
import { embedUrl, PROVIDER_NAMES, sourceUrl, type ClipRef } from "@/lib/clips/links";
import { REPORT_REASONS } from "@/lib/trust/options";
import { addComment, postClip, reportClip, type ClipState } from "./actions";

const control = "min-h-11 w-full rounded-md border border-line bg-bg px-3 text-text focus:border-accent";

function Status({ state }: { state: ClipState }) {
  return (
    <p role="status" aria-live="polite" className={`text-sm ${state?.ok ? "text-success" : "text-danger"}`}>
      {state?.message}
    </p>
  );
}

/**
 * Reproductor con «fachada»: hasta que se pulsa no se carga nada de YouTube, Twitch o Streamable (ni sus cookies),
 * así la lista de clips es ligera y no se comparten datos con terceros sin que el usuario lo decida.
 */
/**
 * Luz ambiental (como en YouTube): detrás del reproductor, un halo del color del juego que respira; al darle a ver un
 * clip de YouTube, su miniatura desenfocada. La miniatura solo se pide después de pulsar: antes, YouTube no recibe nada.
 */
function Ambient({ clip, on }: { clip: ClipRef; on: boolean }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute -inset-6 -z-10 sm:-inset-10">
      <div className="ambient-glow absolute inset-0 rounded-[2rem]" />
      {on && clip.provider === "youtube" && (
        // eslint-disable-next-line @next/next/no-img-element -- imagen decorativa desenfocada, sin optimizar a propósito
        <img
          src={`https://i.ytimg.com/vi/${encodeURIComponent(clip.videoId)}/mqdefault.jpg`}
          alt=""
          className="ambient-image absolute inset-0 size-full rounded-[2rem] object-cover"
        />
      )}
    </div>
  );
}

export function ClipPlayer({ clip, title, ambient = false }: { clip: ClipRef; title: string; ambient?: boolean }) {
  const [on, setOn] = useState(false);
  const t = useTranslations("clips");
  const provider = PROVIDER_NAMES[clip.provider];
  return (
    <div className="relative isolate">
    {ambient && <Ambient clip={clip} on={on} />}
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-bg-raised">
      {on ? (
        <iframe
          src={embedUrl(clip, window.location.hostname)}
          title={t("iframeTitle", { title })}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 size-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setOn(true)}
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-muted transition-colors duration-150 ease-out hover:text-text"
        >
          <span className="flex size-14 items-center justify-center rounded-full bg-accent text-bg">
            <Play aria-hidden="true" className="ml-0.5 size-6" />
          </span>
          {t("watch", { provider })}
          <span className="max-w-xs text-center text-xs">{t("watchNote", { provider })}</span>
        </button>
      )}
      {!on && (
        <a
          href={sourceUrl(clip)}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-2 right-3 text-xs text-muted underline underline-offset-4 hover:text-text"
        >
          {t("openIn", { provider })}
          <span className="sr-only"> {t("newTab")}</span>
        </a>
      )}
    </div>
    </div>
  );
}

export function PostClipForm({ emblems, gameName }: { emblems: { id: string; name: string; description: string }[]; gameName: string }) {
  const [state, action, pending] = useActionState<ClipState, FormData>(postClip, null);
  const err = state?.fieldErrors ?? {};
  const v = state?.values ?? {};
  const t = useTranslations("clips");
  return (
    // La clave cambia con cada envío: el formulario se rehace con lo que se envió como valores iniciales.
    <form key={JSON.stringify(v)} action={action} className="surface flex flex-col gap-5 p-5" noValidate>
      <div className="flex flex-col gap-2">
        <label htmlFor="url" className="text-sm font-medium">
          {t("url")}
        </label>
        <input
          id="url"
          name="url"
          type="url"
          required
          defaultValue={v.url}
          placeholder={t("urlPlaceholder")}
          aria-invalid={!!err.url || undefined}
          aria-describedby={err.url ? "url-error" : "url-hint"}
          className={control}
        />
        <p id="url-hint" className="text-xs text-muted">
          {t("urlHint")}
        </p>
        {err.url && (
          <p id="url-error" className="text-sm text-danger">
            {err.url}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="title" className="text-sm font-medium">
          {t("titleLabel")}
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={v.title}
          maxLength={80}
          aria-invalid={!!err.title || undefined}
          aria-describedby={err.title ? "title-error" : undefined}
          className={control}
        />
        {err.title && (
          <p id="title-error" className="text-sm text-danger">
            {err.title}
          </p>
        )}
      </div>
      <fieldset className="flex flex-col gap-2" aria-describedby={err.emblem ? "emblem-error" : undefined}>
        <legend className="mb-2 text-sm font-medium">{t("category")}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {emblems.map((e) => (
            <label
              key={e.id}
              className="flex min-h-11 cursor-pointer items-start gap-2 rounded-md border border-line p-3 text-sm has-[:checked]:border-accent has-[:checked]:bg-panel-hover"
            >
              <input type="radio" name="emblem" value={e.id} required defaultChecked={v.emblem === e.id} className="mt-0.5 size-4 accent-accent" />
              <span>
                <span className="font-medium">{e.name}</span>
                <span className="block text-muted">{e.description}</span>
              </span>
            </label>
          ))}
        </div>
        {err.emblem && (
          <p id="emblem-error" className="text-sm text-danger">
            {err.emblem}
          </p>
        )}
      </fieldset>
      <p className="text-xs text-muted">{t("postNote", { game: gameName })}</p>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? t("posting") : t("post")}
        </button>
        {!state?.ok && <Status state={state} />}
      </div>
    </form>
  );
}

export function CommentForm({ clipId }: { clipId: string }) {
  const [state, action, pending] = useActionState<ClipState, FormData>(addComment, null);
  const form = useRef<HTMLFormElement>(null);
  const t = useTranslations("clips");
  // Tras publicar, se vacía el campo.
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);
  return (
    <form ref={form} action={action} className="flex flex-col gap-2">
      <input type="hidden" name="clip" value={clipId} />
      <label htmlFor="body" className="text-sm font-medium">
        {t("comment")}
      </label>
      <textarea id="body" name="body" required maxLength={300} rows={3} className={`${control} py-2`} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn-ghost">
          {pending ? t("posting") : t("postComment")}
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}

export function ClipReportForm({ clipId, commentId, label }: { clipId: string; commentId?: number; label?: string }) {
  const [state, action, pending] = useActionState<ClipState, FormData>(reportClip, null);
  const id = `rep-${clipId}-${commentId ?? "clip"}`;
  const tt = useTranslations("trust");
  const to = useTranslations("options.reportReasons");
  if (state?.ok) return <Status state={state} />;
  return (
    <details className="text-sm">
      <summary className="min-h-11 cursor-pointer py-2 text-muted hover:text-text">{label ?? tt("report")}</summary>
      <form action={action} className="mt-2 flex flex-col gap-2 rounded-md border border-line bg-bg p-3">
        <input type="hidden" name="clip" value={clipId} />
        {commentId != null && <input type="hidden" name="comment" value={commentId} />}
        <label htmlFor={`${id}-reason`} className="font-medium">
          {tt("reason")}
        </label>
        <select id={`${id}-reason`} name="reason" defaultValue="" required className={control}>
          <option value="" disabled>
            {tt("chooseReasonOption")}
          </option>
          {optionKeys(REPORT_REASONS).map((k) => (
            <option key={k} value={k}>
              {to(k)}
            </option>
          ))}
        </select>
        <label htmlFor={`${id}-details`} className="font-medium">
          {tt("details")}
        </label>
        <textarea id={`${id}-details`} name="details" maxLength={500} rows={2} className={`${control} py-2`} />
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending} className="min-h-11 rounded-md border border-danger px-4 text-danger hover:bg-panel-hover">
            {tt("send")}
          </button>
          <Status state={state} />
        </div>
      </form>
    </details>
  );
}
