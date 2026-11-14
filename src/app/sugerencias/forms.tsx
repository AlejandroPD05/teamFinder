"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { FEEDBACK_KINDS } from "@/lib/feedback";
import { feedbackStatusAction, sendFeedbackAction, type FeedbackState } from "./actions";

export function FeedbackForm({ page }: { page: string | null }) {
  const [state, action, pending] = useActionState<FeedbackState, FormData>(sendFeedbackAction, null);
  const t = useTranslations("feedback");
  if (state?.ok) {
    return (
      <p role="status" className="surface p-5 text-success">
        {state.message}
      </p>
    );
  }
  const err = state?.fieldErrors;
  return (
    <form action={action} className="surface flex flex-col gap-4 p-5" noValidate>
      {page && <input type="hidden" name="page" value={page} />}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">{t("kindLabel")}</legend>
        <div className="flex flex-wrap gap-2">
          {FEEDBACK_KINDS.map((k, i) => (
            <label key={k} className="chip min-h-11 cursor-pointer has-[:checked]:border-accent has-[:checked]:text-text">
              <input type="radio" name="kind" value={k} defaultChecked={i === 0} className="accent-accent" />
              {t(`kind.${k}`)}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-col gap-1">
        <label htmlFor="feedback-body" className="text-sm font-medium">
          {t("bodyLabel")}
        </label>
        <textarea
          id="feedback-body"
          name="body"
          required
          minLength={10}
          maxLength={1000}
          rows={6}
          aria-invalid={Boolean(err?.body)}
          aria-describedby="feedback-body-hint"
          className="rounded-md border border-line bg-bg p-3 text-sm"
        />
        <p id="feedback-body-hint" className={`text-xs ${err?.body ? "text-danger" : "text-muted"}`}>
          {err?.body ?? t("bodyHint")}
        </p>
      </div>
      <button type="submit" disabled={pending} className="btn-primary self-start">
        {t("send")}
      </button>
      {state && !state.ok && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}
    </form>
  );
}

/** Moderación: marcar como atendida o volver a abrir. */
export function FeedbackStatus({ id, status }: { id: string; status: "new" | "done" }) {
  const [state, action, pending] = useActionState<FeedbackState, FormData>(feedbackStatusAction, null);
  const t = useTranslations("feedback");
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status === "new" ? "done" : "new"} />
      <button type="submit" disabled={pending} className="btn-ghost">
        {status === "new" ? t("markDone") : t("reopen")}
      </button>
      {state && !state.ok && (
        <span role="alert" className="text-sm text-danger">
          {state.message}
        </span>
      )}
    </form>
  );
}
