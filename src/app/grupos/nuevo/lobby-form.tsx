"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { GOALS, LANGUAGES } from "@/lib/profile/options";
import type { Catalog } from "@/lib/profile/queries";
import { createLobby, type ActionState } from "../actions";

const control = "min-h-11 w-full rounded-md border border-line bg-bg px-3 text-text focus:border-accent";
const chip =
  "flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-line px-3 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent/10";

function Err({ id, text }: { id: string; text?: string }) {
  return text ? (
    <p id={id} className="text-sm text-danger">
      {text}
    </p>
  ) : null;
}

export function LobbyForm({ catalog }: { catalog: Catalog }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createLobby, null);
  const [when, setWhen] = useState<"now" | "later">("now");
  // Desfase horario del navegador para interpretar la fecha local (se fija tras hidratar).
  const tzRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (tzRef.current) tzRef.current.value = String(new Date().getTimezoneOffset());
  }, []);
  const err = state?.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <input ref={tzRef} type="hidden" name="tz" defaultValue="0" />
      <fieldset className="surface p-5">
        <legend className="font-semibold">Modo</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {catalog.modes.map((m, i) => (
            <label key={m.slug} className={chip}>
              <input type="radio" name="mode" value={m.slug} defaultChecked={i === 0} className="size-4 accent-accent" />
              {m.name} · {m.party_size} plazas
            </label>
          ))}
        </div>
        <Err id="mode-error" text={err.mode} />
      </fieldset>

      <fieldset className="surface p-5">
        <legend className="font-semibold">Roles que buscáis</legend>
        <p className="mt-1 text-sm text-muted">Orientativo: no hay una composición obligatoria.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {catalog.roles.map((r) => (
            <label key={r.id} className={chip}>
              <input type="checkbox" name="roles" value={r.id} className="size-4 accent-accent" />
              {r.name}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="grid gap-4 surface p-5 sm:grid-cols-2">
        <legend className="font-semibold">Requisitos (opcionales)</legend>
        {[
          ["rank_min", "Rango mínimo", catalog.ranks.map((r) => [r.id, r.name]), "Sin mínimo"],
          ["rank_max", "Rango máximo", catalog.ranks.map((r) => [r.id, r.name]), "Sin máximo"],
          ["region", "Servidor", catalog.regions.map((r) => [r.id, r.name]), "Cualquiera"],
          ["language", "Idioma", Object.entries(LANGUAGES), "Cualquiera"],
          ["goal", "Objetivo", Object.entries(GOALS), "Cualquiera"],
        ].map(([name, text, options, any]) => (
          <div key={name as string} className="flex flex-col gap-2 text-sm font-medium">
            <label htmlFor={`n-${name}`}>{text as string}</label>
            <select id={`n-${name}`} name={name as string} defaultValue="" className={control}>
              <option value="">{any as string}</option>
              {(options as string[][]).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        ))}
      </fieldset>

      <fieldset className="surface p-5">
        <legend className="font-semibold">Cuándo</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          <label className={chip}>
            <input type="radio" name="when" value="now" checked={when === "now"} onChange={() => setWhen("now")} className="size-4 accent-accent" />
            Ahora
          </label>
          <label className={chip}>
            <input type="radio" name="when" value="later" checked={when === "later"} onChange={() => setWhen("later")} className="size-4 accent-accent" />
            Más tarde
          </label>
        </div>
        {when === "later" && (
          <div className="mt-3 flex flex-col gap-2 text-sm font-medium">
            <label htmlFor="starts_at">Fecha y hora</label>
            <input
              id="starts_at"
              name="starts_at"
              type="datetime-local"
              aria-invalid={!!err.starts_at || undefined}
              aria-describedby={err.starts_at ? "starts_at-error" : undefined}
              className={`${control} sm:w-72`}
            />
            <Err id="starts_at-error" text={err.starts_at} />
          </div>
        )}
      </fieldset>

      <div className="flex flex-col gap-2 surface p-5 text-sm font-medium">
        <label htmlFor="note">Nota (opcional)</label>
        <input
          id="note"
          name="note"
          maxLength={140}
          placeholder="Ej.: buscamos smoker para subir a Platino"
          aria-invalid={!!err.note || undefined}
          aria-describedby={err.note ? "note-error" : undefined}
          className={control}
        />
        <Err id="note-error" text={err.note} />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="btn-primary"
        >
          {pending ? "Creando…" : "Crear grupo"}
        </button>
        <p role="status" aria-live="polite" className="text-sm text-danger">
          {state && !state.ok ? state.message : ""}
        </p>
      </div>
    </form>
  );
}
