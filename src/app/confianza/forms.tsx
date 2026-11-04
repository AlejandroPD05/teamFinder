"use client";

import { useActionState } from "react";
import { KARMA_TAGS, REPORT_REASONS } from "@/lib/trust/options";
import {
  blockAction,
  deleteAccountAction,
  reportAction,
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
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!blocked && !window.confirm(`¿Bloquear a ${name}? No os veréis en búsquedas ni grupos.`)) e.preventDefault();
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="user_id" value={userId} />
      <input type="hidden" name="intent" value={blocked ? "unblock" : "block"} />
      <button type="submit" disabled={pending} className={`${btn} border border-line hover:bg-panel-hover`}>
        {blocked ? "Desbloquear" : "Bloquear"}
      </button>
      <Status state={state} />
    </form>
  );
}

export function ReportForm({
  targetId,
  messageId,
  lobbyId,
  label = "Denunciar",
}: {
  targetId: string;
  messageId?: number;
  lobbyId?: string;
  label?: string;
}) {
  const [state, action, pending] = useActionState<TrustState, FormData>(reportAction, null);
  const id = `rep-${targetId}-${messageId ?? "u"}`;
  if (state?.ok) return <Status state={state} />;
  return (
    <details className="text-sm">
      <summary className="min-h-11 cursor-pointer py-2 text-muted hover:text-text">{label}</summary>
      <form action={action} className="mt-2 flex flex-col gap-2 rounded-md border border-line bg-bg p-3">
        <input type="hidden" name="target" value={targetId} />
        {messageId != null && <input type="hidden" name="message_id" value={messageId} />}
        {lobbyId && <input type="hidden" name="lobby_id" value={lobbyId} />}
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
        <textarea id={`${id}-details`} name="details" maxLength={500} rows={3} className={`${control} py-2`} />
        <p className="text-xs text-muted">La persona denunciada no sabrá quién la ha denunciado.</p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending} className={`${btn} border border-danger/50 text-danger hover:bg-danger/10`}>
            Enviar denuncia
          </button>
          <Status state={state} />
        </div>
      </form>
    </details>
  );
}

export function KarmaVote({ lobbyId, targetId, name }: { lobbyId: string; targetId: string; name: string }) {
  const [state, action, pending] = useActionState<TrustState, FormData>(voteAction, null);
  if (state?.ok) return <Status state={state} />;
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="lobby_id" value={lobbyId} />
      <input type="hidden" name="target" value={targetId} />
      <fieldset>
        <legend className="text-sm font-medium">¿Qué tal con {name}?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            ["1", "Positiva"],
            ["-1", "Negativa"],
          ].map(([v, l]) => (
            <label key={v} className="flex min-h-11 items-center gap-2 rounded-md border border-line px-3 text-sm has-[:checked]:border-accent">
              <input type="radio" name="value" value={v} required className="size-4 accent-accent" />
              {l}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm text-muted">Etiquetas (hasta 3, opcional)</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {Object.entries(KARMA_TAGS).map(([k, v]) => (
            <label key={k} className="flex min-h-11 items-center gap-2 rounded-md border border-line px-3 text-sm has-[:checked]:border-accent">
              <input type="checkbox" name="tags" value={k} className="size-4 accent-accent" />
              {v}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={`${btn} bg-accent font-semibold text-bg hover:bg-accent-soft`}>
          Guardar valoración
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}

export function ResolveForm({ reportId }: { reportId: string }) {
  const [state, action, pending] = useActionState<TrustState, FormData>(resolveAction, null);
  if (state?.ok) return <Status state={state} />;
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="report_id" value={reportId} />
      <label htmlFor={`note-${reportId}`} className="text-sm font-medium">
        Nota de moderación (opcional)
      </label>
      <input id={`note-${reportId}`} name="note" maxLength={500} className={control} />
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" name="status" value="actioned" disabled={pending} className={`${btn} bg-accent font-semibold text-bg`}>
          Marcar como actuada
        </button>
        <button type="submit" name="status" value="dismissed" disabled={pending} className={`${btn} border border-line hover:bg-panel-hover`}>
          Descartar
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState<TrustState, FormData>(deleteAccountAction, null);
  return (
    <form action={action} className="flex flex-col gap-2">
      <label htmlFor="confirm" className="text-sm font-medium">
        Escribe BORRAR para confirmar
      </label>
      <input id="confirm" name="confirm" autoComplete="off" className={`${control} sm:w-60`} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={`${btn} border border-danger/50 text-danger hover:bg-danger/10`}>
          Borrar mi cuenta
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}
