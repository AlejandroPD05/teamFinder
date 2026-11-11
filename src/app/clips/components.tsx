"use client";

import { Play } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
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
export function ClipPlayer({ clip, title }: { clip: ClipRef; title: string }) {
  const [on, setOn] = useState(false);
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-bg-raised">
      {on ? (
        <iframe
          src={embedUrl(clip, window.location.hostname)}
          title={`Clip: ${title}`}
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
          Ver clip ({PROVIDER_NAMES[clip.provider]})
          <span className="text-xs">Se cargará el reproductor de {PROVIDER_NAMES[clip.provider]}.</span>
        </button>
      )}
      {!on && (
        <a
          href={sourceUrl(clip)}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-2 right-3 text-xs text-muted underline underline-offset-4 hover:text-text"
        >
          Abrir en {PROVIDER_NAMES[clip.provider]}
          <span className="sr-only"> (se abre en otra pestaña)</span>
        </a>
      )}
    </div>
  );
}

export function PostClipForm({ emblems, gameName }: { emblems: { id: string; name: string; description: string }[]; gameName: string }) {
  const [state, action, pending] = useActionState<ClipState, FormData>(postClip, null);
  const err = state?.fieldErrors ?? {};
  const v = state?.values ?? {};
  return (
    // La clave cambia con cada envío: el formulario se rehace con lo que se envió como valores iniciales.
    <form key={JSON.stringify(v)} action={action} className="surface flex flex-col gap-5 p-5" noValidate>
      <div className="flex flex-col gap-2">
        <label htmlFor="url" className="text-sm font-medium">
          Enlace del clip
        </label>
        <input
          id="url"
          name="url"
          type="url"
          required
          defaultValue={v.url}
          placeholder="https://youtu.be/… o https://clips.twitch.tv/…"
          aria-invalid={!!err.url || undefined}
          aria-describedby={err.url ? "url-error" : "url-hint"}
          className={control}
        />
        <p id="url-hint" className="text-xs text-muted">
          YouTube (también Shorts), clips de Twitch o Streamable. El vídeo se queda en su web: aquí solo se enlaza.
        </p>
        {err.url && (
          <p id="url-error" className="text-sm text-danger">
            {err.url}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="title" className="text-sm font-medium">
          Título
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
        <legend className="mb-2 text-sm font-medium">Categoría</legend>
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
      <p className="text-xs text-muted">
        Se publicará en los clips de {gameName}. Publica solo clips tuyos o con permiso de quien los grabó. Como mucho 5 al día.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Publicando…" : "Publicar clip"}
        </button>
        {!state?.ok && <Status state={state} />}
      </div>
    </form>
  );
}

export function CommentForm({ clipId }: { clipId: string }) {
  const [state, action, pending] = useActionState<ClipState, FormData>(addComment, null);
  const form = useRef<HTMLFormElement>(null);
  // Tras publicar, se vacía el campo.
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);
  return (
    <form ref={form} action={action} className="flex flex-col gap-2">
      <input type="hidden" name="clip" value={clipId} />
      <label htmlFor="body" className="text-sm font-medium">
        Comentar
      </label>
      <textarea id="body" name="body" required maxLength={300} rows={3} className={`${control} py-2`} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn-ghost">
          {pending ? "Publicando…" : "Publicar comentario"}
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}

export function ClipReportForm({ clipId, commentId, label = "Denunciar" }: { clipId: string; commentId?: number; label?: string }) {
  const [state, action, pending] = useActionState<ClipState, FormData>(reportClip, null);
  const id = `rep-${clipId}-${commentId ?? "clip"}`;
  if (state?.ok) return <Status state={state} />;
  return (
    <details className="text-sm">
      <summary className="min-h-11 cursor-pointer py-2 text-muted hover:text-text">{label}</summary>
      <form action={action} className="mt-2 flex flex-col gap-2 rounded-md border border-line bg-bg p-3">
        <input type="hidden" name="clip" value={clipId} />
        {commentId != null && <input type="hidden" name="comment" value={commentId} />}
        <label htmlFor={`${id}-reason`} className="font-medium">
          Motivo
        </label>
        <select id={`${id}-reason`} name="reason" defaultValue="" required className={control}>
          <option value="" disabled>
            Elige un motivo
          </option>
          {Object.entries(REPORT_REASONS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <label htmlFor={`${id}-details`} className="font-medium">
          Detalles (opcional)
        </label>
        <textarea id={`${id}-details`} name="details" maxLength={500} rows={2} className={`${control} py-2`} />
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending} className="min-h-11 rounded-md border border-danger px-4 text-danger hover:bg-panel-hover">
            Enviar denuncia
          </button>
          <Status state={state} />
        </div>
      </form>
    </details>
  );
}
