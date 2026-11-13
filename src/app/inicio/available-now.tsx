"use client";

import { useActionState } from "react";
import { setAvailableAction, type AvailableState } from "../disponible/actions";

const timeFmt = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" });

/**
 * «¿Juegas ahora?»: te marcas disponible 1, 2 o 3 horas (y, si quieres, en qué modo). Quien busca jugadores puede
 * filtrar por los disponibles. Pasado ese tiempo deja de mostrarse solo.
 */
export function AvailableNow({
  until,
  mode,
  modes,
  gameName,
}: {
  until: string | null;
  mode: string | null;
  modes: { slug: string; name: string }[];
  gameName: string;
}) {
  const [state, action, pending] = useActionState<AvailableState, FormData>(setAvailableAction, null);
  const active = until && new Date(until) > new Date();
  return (
    <section aria-labelledby="ahora" className={`surface flex flex-col gap-3 p-5 ${active ? "ring-1 ring-success" : ""}`}>
      <h2 id="ahora" className="flex items-center gap-2 font-semibold">
        {active && <span aria-hidden="true" className="live-dot" />}
        {active ? "Estás disponible" : `¿Juegas a ${gameName} ahora?`}
      </h2>
      {active ? (
        <form action={action} className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted">
            Hasta las {timeFmt.format(new Date(until))}
            {mode && ` · ${modes.find((m) => m.slug === mode)?.name ?? mode}`}. Te ven quienes buscan «disponibles ahora».
          </p>
          <button type="submit" name="hours" value="0" disabled={pending} className="btn-ghost">
            Ya no estoy disponible
          </button>
        </form>
      ) : (
        <form action={action} className="flex flex-col gap-3">
          <p className="text-sm text-muted">Márcate disponible y te encontrarán quienes buscan gente para jugar ya.</p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Modo (opcional)</span>
              <select name="mode" defaultValue="" className="min-h-11 rounded-md border border-line bg-bg px-3 text-text focus:border-accent">
                <option value="">Cualquiera</option>
                {modes.map((m) => (
                  <option key={m.slug} value={m.slug}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            {[1, 2, 3].map((h) => (
              <button key={h} type="submit" name="hours" value={h} disabled={pending} className={h === 1 ? "btn-primary" : "btn-ghost"}>
                {h === 1 ? "1 hora" : `${h} horas`}
              </button>
            ))}
          </div>
        </form>
      )}
      <p role="status" aria-live="polite" className={`text-sm ${state?.ok ? "text-success" : "text-danger"}`}>
        {state?.message}
      </p>
    </section>
  );
}
