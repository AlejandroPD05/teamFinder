"use client";

import { ThumbsUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { IDEA_STATUSES, type IdeaStatus } from "@/lib/ideas";
import { outcomeOf, useStickyForm } from "@/lib/use-sticky-form";
import { deleteIdeaAction, saveIdeaAction, voteIdeaAction, type IdeaState } from "./actions";

const control = "min-h-11 w-full rounded-md border border-line bg-bg px-3 text-text focus:border-accent";

function Status({ state }: { state: IdeaState }) {
  return (
    <p role="status" aria-live="polite" className={`text-sm ${state?.ok ? "text-success" : "text-danger"}`}>
      {state?.message}
    </p>
  );
}

/** Apoyar una idea: botón conmutado con el recuento visible y un nombre accesible con contexto. */
export function VoteButton({ id, title, votes, voted }: { id: string; title: string; votes: number; voted: boolean }) {
  const [state, action, pending] = useActionState<IdeaState, FormData>(voteIdeaAction, null);
  const t = useTranslations("ideas");
  return (
    <form action={action} className="flex flex-col items-start gap-1">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="on" value={voted ? "0" : "1"} />
      <button
        type="submit"
        disabled={pending}
        aria-pressed={voted}
        aria-label={t("voteLabel", { title, count: votes })}
        className={`inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm tabular-nums ${
          voted ? "border-accent bg-panel-hover font-semibold text-text" : "border-line text-muted hover:bg-panel-hover hover:text-text"
        }`}
      >
        <ThumbsUp aria-hidden="true" className={`size-4 ${voted ? "text-accent-soft" : ""}`} />
        {votes}
      </button>
      {state && !state.ok && <Status state={state} />}
    </form>
  );
}

type Draft = { id?: string; title: string; body: string | null; status: IdeaStatus };

/** Moderación: publicar o editar una idea. Desde una sugerencia, llega con su texto para reescribirlo. */
export function IdeaEditor({ idea, feedbackId }: { idea?: Draft; feedbackId?: string }) {
  const [state, action, pending] = useActionState<IdeaState, FormData>(saveIdeaAction, null);
  const form = useStickyForm(action, state, outcomeOf(state), { resetOnSuccess: !idea?.id });
  const t = useTranslations("ideas");
  const err = state?.fieldErrors ?? {};
  const key = idea?.id ?? "new";
  return (
    <form {...form} noValidate className="flex flex-col gap-3">
      {idea?.id && <input type="hidden" name="id" value={idea.id} />}
      {feedbackId && <input type="hidden" name="feedback_id" value={feedbackId} />}
      <div className="flex flex-col gap-1">
        <label htmlFor={`title-${key}`} className="text-sm font-medium">
          {t("titleField")}
        </label>
        <input
          id={`title-${key}`}
          name="title"
          defaultValue={idea?.title}
          maxLength={80}
          aria-invalid={!!err.title || undefined}
          aria-describedby={err.title ? `title-${key}-error` : undefined}
          className={control}
        />
        {err.title && (
          <p id={`title-${key}-error`} className="text-sm text-danger">
            {err.title}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`body-${key}`} className="text-sm font-medium">
          {t("bodyField")}
        </label>
        <textarea
          id={`body-${key}`}
          name="body"
          rows={3}
          maxLength={500}
          defaultValue={idea?.body ?? ""}
          aria-invalid={!!err.body || undefined}
          aria-describedby={err.body ? `body-${key}-error` : `body-${key}-hint`}
          className={`${control} py-2`}
        />
        <p id={err.body ? `body-${key}-error` : `body-${key}-hint`} className={`text-sm ${err.body ? "text-danger" : "text-muted"}`}>
          {err.body ?? t("bodyHint")}
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={`status-${key}`} className="text-sm font-medium">
            {t("statusField")}
          </label>
          <select id={`status-${key}`} name="status" defaultValue={idea?.status ?? "pending"} className={control}>
            {IDEA_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`status.${s}`)}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={pending} className="btn-primary">
          {idea?.id ? t("save") : t("publish")}
        </button>
      </div>
      <Status state={state} />
    </form>
  );
}

export function DeleteIdea({ id, title }: { id: string; title: string }) {
  const [state, action, pending] = useActionState<IdeaState, FormData>(deleteIdeaAction, null);
  const t = useTranslations("ideas");
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(t("deleteConfirm"))) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={pending} aria-label={t("deleteLabel", { title })} className="min-h-11 rounded-md px-3 text-sm text-danger hover:bg-panel-hover">
        {t("delete")}
      </button>
      {state && !state.ok && <Status state={state} />}
    </form>
  );
}
