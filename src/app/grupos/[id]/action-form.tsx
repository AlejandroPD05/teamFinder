"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { lobbyAction, type ActionState } from "../actions";

const styles = {
  primary: "bg-accent font-semibold text-bg hover:bg-accent-soft",
  neutral: "border border-line hover:bg-panel-hover",
  danger: "border border-danger text-danger hover:bg-panel-hover",
} as const;

/** Formulario de una acción del grupo con su propio estado accesible (éxito o error). */
export function ActionForm({
  lobbyId,
  intent,
  label,
  pendingLabel,
  variant = "neutral",
  requestId,
  withMessage = false,
  confirm,
}: {
  lobbyId: string;
  intent: "request" | "withdraw" | "accept" | "reject" | "leave" | "close";
  label: string;
  pendingLabel?: string;
  variant?: keyof typeof styles;
  requestId?: string;
  withMessage?: boolean;
  confirm?: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(lobbyAction, null);
  const t = useTranslations("lobby");
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className="flex flex-col gap-2"
    >
      <input type="hidden" name="lobby_id" value={lobbyId} />
      <input type="hidden" name="intent" value={intent} />
      {requestId && <input type="hidden" name="request_id" value={requestId} />}
      {withMessage && (
        <>
          <label htmlFor={`msg-${lobbyId}`} className="text-sm font-medium">
            {t("requestMessage")}
          </label>
          <input
            id={`msg-${lobbyId}`}
            name="message"
            maxLength={200}
            placeholder={t("requestPlaceholder")}
            className="min-h-11 rounded-md border border-line bg-bg px-3 text-text focus:border-accent"
          />
        </>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={`min-h-11 rounded-md px-4 text-sm disabled:opacity-60 ${styles[variant]}`}>
          {pending ? (pendingLabel ?? t("wait")) : label}
        </button>
        <p role="status" aria-live="polite" className={`text-sm ${state?.ok ? "text-success" : "text-danger"}`}>
          {state?.message}
        </p>
      </div>
    </form>
  );
}
