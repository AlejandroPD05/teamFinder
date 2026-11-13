"use client";

import { useActionState } from "react";
import { emailNotificationsAction, type EmailState } from "./actions";

/** Activar o desactivar el resumen de avisos por correo (opt-in: viene desactivado). */
export function EmailNotificationsForm({ enabled }: { enabled: boolean }) {
  const [state, action, pending] = useActionState<EmailState, FormData>(emailNotificationsAction, null);
  const on = state?.ok ? state.enabled : enabled;
  return (
    <form action={action} className="flex flex-col items-start gap-2">
      <input type="hidden" name="enabled" value={on ? "off" : "on"} />
      <p className="text-sm">
        Ahora mismo: <strong>{on ? "activados" : "desactivados"}</strong>.
      </p>
      <button type="submit" disabled={pending} className="btn-ghost">
        {on ? "Desactivar avisos por correo" : "Activar avisos por correo"}
      </button>
      <p role="status" aria-live="polite" className={`text-sm ${state?.ok ? "text-success" : "text-danger"}`}>
        {state?.message}
      </p>
    </form>
  );
}
