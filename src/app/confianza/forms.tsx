"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { optionKeys } from "@/lib/profile/options";
import { KARMA_TAGS, REPORT_REASONS } from "@/lib/trust/options";
import {
  blockAction,
  deleteAccountAction,
  liftRestrictionAction,
  reportAction,
  restrictAction,
  resolveAction,
  voteAction,
  type TrustState,
} from "./actions";

const control = "min-h-11 rounded-md border border-line bg-bg px-3 text-sm text-text focus:border-accent";
const btn = "min-h-11 rounded-md px-4 text-sm disabled:opacity-60";

function Status({ state }: { state: TrustState }) {
  return (
    <p role="status" aria-live="polite" className={`text-sm ${state?.ok ? "text-success" : "text-danger"}`}>
      {state?.message}
    </p>
  );
}

export function BlockButton({ userId, blocked, name }: { userId: string; blocked: boolean; name: string }) {
  const [state, action, pending] = useActionState<TrustState, FormData>(blockAction, null);
  const t = useTranslations("trust");
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!blocked && !window.confirm(t("blockConfirm", { name }))) e.preventDefault();
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="user_id" value={userId} />
      <input type="hidden" name="intent" value={blocked ? "unblock" : "block"} />
      <button type="submit" disabled={pending} className={`${btn} border border-line hover:bg-panel-hover`}>
        {blocked ? t("unblock") : t("block")}
      </button>
      <Status state={state} />
    </form>
  );
}

export function ReportForm({
  targetId,
  messageId,
  lobbyId,
  label,
}: {
  targetId: string;
  messageId?: number;
  lobbyId?: string;
  label?: string;
}) {
  const [state, action, pending] = useActionState<TrustState, FormData>(reportAction, null);
  const t = useTranslations("trust");
  const to = useTranslations("options.reportReasons");
  const id = `rep-${targetId}-${messageId ?? "u"}`;
  if (state?.ok) return <Status state={state} />;
  return (
    <details className="text-sm">
      <summary className="min-h-11 cursor-pointer py-2 text-muted hover:text-text">{label ?? t("report")}</summary>
      <form action={action} className="mt-2 flex flex-col gap-2 rounded-md border border-line bg-bg p-3">
        <input type="hidden" name="target" value={targetId} />
        {messageId != null && <input type="hidden" name="message_id" value={messageId} />}
        {lobbyId && <input type="hidden" name="lobby_id" value={lobbyId} />}
        <label htmlFor={`${id}-reason`} className="font-medium">
          {t("reason")}
        </label>
        <select id={`${id}-reason`} name="reason" defaultValue="" required className={control}>
          <option value="" disabled>
            {t("chooseReasonOption")}
          </option>
          {optionKeys(REPORT_REASONS).map((k) => (
            <option key={k} value={k}>
              {to(k)}
            </option>
          ))}
        </select>
        <label htmlFor={`${id}-details`} className="font-medium">
          {t("details")}
        </label>
        <textarea id={`${id}-details`} name="details" maxLength={500} rows={3} className={`${control} py-2`} />
        <p className="text-xs text-muted">{t("anonymous")}</p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending} className={`${btn} border border-danger text-danger hover:bg-panel-hover`}>
            {t("send")}
          </button>
          <Status state={state} />
        </div>
      </form>
    </details>
  );
}

export function KarmaVote({ lobbyId, targetId, name }: { lobbyId: string; targetId: string; name: string }) {
  const [state, action, pending] = useActionState<TrustState, FormData>(voteAction, null);
  const t = useTranslations("trust");
  const to = useTranslations("options.karmaTags");
  if (state?.ok) return <Status state={state} />;
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="lobby_id" value={lobbyId} />
      <input type="hidden" name="target" value={targetId} />
      <input type="hidden" name="value" value="1" />
      <p className="text-sm font-medium">{t("voteQuestion", { name })}</p>
      <fieldset>
        <legend className="text-sm text-muted">{t("voteWhy")}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {optionKeys(KARMA_TAGS).map((k) => (
            <label key={k} className="flex min-h-11 items-center gap-2 rounded-md border border-line px-3 text-sm has-[:checked]:border-accent">
              <input type="checkbox" name="tags" value={k} className="size-4 accent-accent" />
              {to(k)}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={`${btn} bg-accent font-semibold text-bg hover:bg-accent-soft`}>
          {t("vote")}
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}

export function ResolveForm({ reportId }: { reportId: string }) {
  const [state, action, pending] = useActionState<TrustState, FormData>(resolveAction, null);
  const t = useTranslations("trust");
  if (state?.ok) return <Status state={state} />;
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="report_id" value={reportId} />
      <label htmlFor={`note-${reportId}`} className="text-sm font-medium">
        {t("modNote")}
      </label>
      <input id={`note-${reportId}`} name="note" maxLength={500} className={control} />
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" name="status" value="actioned" disabled={pending} className={`${btn} bg-accent font-semibold text-bg`}>
          {t("actioned")}
        </button>
        <button type="submit" name="status" value="dismissed" disabled={pending} className={`${btn} border border-line hover:bg-panel-hover`}>
          {t("dismiss")}
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState<TrustState, FormData>(deleteAccountAction, null);
  const t = useTranslations("trust");
  return (
    <form action={action} className="flex flex-col gap-2">
      <label htmlFor="confirm" className="text-sm font-medium">
        {t("confirmLabel", { word: t("confirmWord") })}
      </label>
      <input id="confirm" name="confirm" autoComplete="off" className={`${control} sm:w-60`} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={`${btn} border border-danger text-danger hover:bg-panel-hover`}>
          {t("deleteAccount")}
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}

/** Moderación: restricción temporal (no puede crear grupos, pedir unirse, escribir, publicar clips ni dar emblemas). */
export function RestrictForm({ userId, reportId }: { userId: string; reportId?: string }) {
  const [state, action, pending] = useActionState<TrustState, FormData>(restrictAction, null);
  const id = `res-${reportId ?? userId}`;
  const t = useTranslations("trust");
  if (state?.ok) return <Status state={state} />;
  return (
    <details className="text-sm">
      <summary className="min-h-11 cursor-pointer py-2 text-muted hover:text-text">{t("restrictTitle")}</summary>
      <form action={action} className="mt-2 flex flex-col gap-2 rounded-md border border-line bg-bg p-3">
        <input type="hidden" name="user_id" value={userId} />
        {reportId && <input type="hidden" name="report_id" value={reportId} />}
        <label htmlFor={`${id}-days`} className="font-medium">
          {t("duration")}
        </label>
        <select id={`${id}-days`} name="days" defaultValue="7" className={control}>
          {[1, 3, 7, 30].map((d) => (
            <option key={d} value={d}>
              {t("days", { count: d })}
            </option>
          ))}
        </select>
        <label htmlFor={`${id}-reason`} className="font-medium">
          {t("restrictReason")}
        </label>
        <input id={`${id}-reason`} name="reason" required minLength={3} maxLength={500} className={control} />
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending} className={`${btn} border border-danger text-danger hover:bg-panel-hover`}>
            {t("restrict")}
          </button>
          <Status state={state} />
        </div>
      </form>
    </details>
  );
}

export function LiftRestrictionButton({ restrictionId }: { restrictionId: string }) {
  const [state, action, pending] = useActionState<TrustState, FormData>(liftRestrictionAction, null);
  const t = useTranslations("trust");
  if (state?.ok) return <Status state={state} />;
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="restriction_id" value={restrictionId} />
      <button type="submit" disabled={pending} className={`${btn} border border-line hover:bg-panel-hover`}>
        {t("lift")}
      </button>
      <Status state={state} />
    </form>
  );
}
