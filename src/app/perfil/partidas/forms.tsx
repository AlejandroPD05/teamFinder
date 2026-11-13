"use client";

import { useActionState, useEffect, useRef } from "react";
import { MATCH_RESULTS } from "@/lib/matches";
import { VISIBILITY, type Visibility } from "@/lib/profile/options";
import { addMatchAction, deleteMatchAction, matchesVisibilityAction, type MatchState } from "./actions";

const control = "min-h-11 w-full rounded-md border border-line bg-bg px-3 text-text focus:border-accent";

function Status({ state }: { state: MatchState }) {
  return (
    <p role="status" aria-live="polite" className={`text-sm ${state?.ok ? "text-success" : "text-danger"}`}>
      {state?.message}
    </p>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function AddMatchForm({
  today,
  modes,
  characters,
  characterLabel,
  maps,
}: {
  today: string;
  modes: { id: string; name: string }[];
  characters: { id: string; name: string }[];
  characterLabel: string | null;
  maps: string[];
}) {
  const [state, action, pending] = useActionState<MatchState, FormData>(addMatchAction, null);
  const err = state?.fieldErrors ?? {};
  const formRef = useRef<HTMLFormElement>(null);
  // Tras apuntar una partida, el formulario se vacía para la siguiente.
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);
  return (
    <form ref={formRef} action={action} noValidate className="flex flex-col gap-4 surface p-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field id="played_on" label="Fecha" error={err.played_on}>
          <input id="played_on" name="played_on" type="date" required max={today} defaultValue={today} className={control} />
        </Field>
        <Field id="mode_id" label="Modo">
          <select id="mode_id" name="mode_id" defaultValue="" className={control}>
            <option value="">Sin indicar</option>
            {modes.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </Field>
        <Field id="map_name" label="Mapa" error={err.map_name}>
          <input id="map_name" name="map_name" list="maps" maxLength={40} autoComplete="off" className={control} />
          <datalist id="maps">
            {maps.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </Field>
        {characterLabel && (
          <Field id="character_id" label={characterLabel.replace(/s$/, "")}>
            <select id="character_id" name="character_id" defaultValue="" className={control}>
              <option value="">Sin indicar</option>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field id="result" label="Resultado">
          <select id="result" name="result" defaultValue="" className={control}>
            <option value="">Sin indicar</option>
            {Object.entries(MATCH_RESULTS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field id="placement" label="Puesto final (battle royale)" error={err.placement}>
          <input id="placement" name="placement" type="number" min={1} max={60} inputMode="numeric" className={control} />
        </Field>
      </div>
      <fieldset className="grid grid-cols-3 gap-3">
        <legend className="mb-1.5 text-sm font-medium">Tus números (opcional)</legend>
        <Field id="kills" label="Bajas" error={err.kills}>
          <input id="kills" name="kills" type="number" min={0} max={200} inputMode="numeric" className={control} />
        </Field>
        <Field id="deaths" label="Muertes" error={err.deaths}>
          <input id="deaths" name="deaths" type="number" min={0} max={200} inputMode="numeric" className={control} />
        </Field>
        <Field id="assists" label="Asistencias" error={err.assists}>
          <input id="assists" name="assists" type="number" min={0} max={200} inputMode="numeric" className={control} />
        </Field>
      </fieldset>
      <Field id="note" label="Nota (opcional)" error={err.note}>
        <input id="note" name="note" maxLength={200} className={control} />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary">
          Apuntar partida
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}

export function DeleteMatch({ id, label }: { id: string; label: string }) {
  const [state, action, pending] = useActionState<MatchState, FormData>(deleteMatchAction, null);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        aria-label={`Borrar ${label}`}
        className="min-h-11 rounded-md px-3 text-sm text-muted hover:bg-panel-hover hover:text-text"
      >
        Borrar
      </button>
      {state && !state.ok && <Status state={state} />}
    </form>
  );
}

export function MatchesVisibility({ value }: { value: Visibility }) {
  const [state, action, pending] = useActionState<MatchState, FormData>(matchesVisibilityAction, null);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2 text-sm">
      <label htmlFor="matches-visibility" className="text-muted">
        Quién ve tus partidas:
      </label>
      <select id="matches-visibility" name="visibility" defaultValue={value} className="min-h-9 rounded-md border border-line bg-bg px-3 text-sm text-text focus:border-accent">
        {Object.entries(VISIBILITY).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
      <button type="submit" disabled={pending} className="btn-ghost min-h-9">
        Guardar
      </button>
      <Status state={state} />
    </form>
  );
}
