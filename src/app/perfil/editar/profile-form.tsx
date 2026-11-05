"use client";

import { useActionState } from "react";
import {
  AVAILABILITY,
  CHARACTER_STATUS,
  GOALS,
  LANGUAGES,
  VISIBILITY,
  VOICE,
  type Visibility,
} from "@/lib/profile/options";
import { CharacterIcon, RoleIcon } from "@/components/game-icons";
import type { Catalog } from "@/lib/profile/queries";
import { saveProfile, type SaveState } from "./actions";

export type ProfileFormValues = {
  display_name: string;
  languages: string[];
  availability: string[];
  goals: string[];
  voice: string | null;
  languages_visibility: Visibility;
  availability_visibility: Visibility;
  goals_visibility: Visibility;
  voice_visibility: Visibility;
  rank_id: string | null;
  region_id: string | null;
  flex: boolean;
  game_visibility: Visibility;
  roles: string[];
  modes: string[];
  primary_role: string | null;
  characters: Record<string, string>;
};

const box = "surface p-5";
const legend = "text-base font-semibold";
const control =
  "min-h-11 rounded-md border border-line bg-bg px-3 text-text focus:border-accent";
const chip =
  "flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-line px-3 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent/10";

function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={id} className="mt-2 text-sm text-danger">
      {error}
    </p>
  );
}

function VisibilitySelect({ name, value, label }: { name: string; value: Visibility; label: string }) {
  return (
    <label className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
      <span>Quién ve {label}:</span>
      <select name={name} defaultValue={value} className={`${control} min-h-9 text-sm`}>
        {Object.entries(VISIBILITY).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
    </label>
  );
}

function Checks({
  name,
  options,
  selected,
  errorId,
}: {
  name: string;
  options: Record<string, string>;
  selected: string[];
  errorId?: string;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2" aria-describedby={errorId}>
      {Object.entries(options).map(([k, v]) => (
        <label key={k} className={chip}>
          <input type="checkbox" name={name} value={k} defaultChecked={selected.includes(k)} className="size-4 accent-accent" />
          {v}
        </label>
      ))}
    </div>
  );
}

export function ProfileForm({ catalog, values }: { catalog: Catalog; values: ProfileFormValues }) {
  const [state, action, pending] = useActionState<SaveState, FormData>(saveProfile, null);
  const err = state?.fieldErrors ?? {};
  const roleName = new Map(catalog.roles.map((r) => [r.id, r.name]));

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <fieldset className={box}>
        <legend className={legend}>Datos básicos</legend>
        <label htmlFor="display_name" className="mt-3 block text-sm font-medium">
          Nombre visible
        </label>
        <input
          id="display_name"
          name="display_name"
          defaultValue={values.display_name}
          required
          minLength={2}
          maxLength={32}
          aria-invalid={!!err.display_name || undefined}
          aria-describedby={err.display_name ? "display_name-error" : "display_name-hint"}
          className={`${control} mt-2 w-full`}
        />
        <p id="display_name-hint" className="mt-2 text-sm text-muted">
          Siempre visible, junto con tu avatar.
        </p>
        <FieldError id="display_name-error" error={err.display_name} />
      </fieldset>

      <fieldset className={box}>
        <legend className={legend}>Idiomas</legend>
        <Checks name="languages" options={LANGUAGES} selected={values.languages} errorId="languages-error" />
        <FieldError id="languages-error" error={err.languages} />
        <VisibilitySelect name="languages_visibility" value={values.languages_visibility} label="tus idiomas" />
      </fieldset>

      <fieldset className={box}>
        <legend className={legend}>Horarios habituales</legend>
        <Checks name="availability" options={AVAILABILITY} selected={values.availability} />
        <VisibilitySelect name="availability_visibility" value={values.availability_visibility} label="tus horarios" />
      </fieldset>

      <fieldset className={box}>
        <legend className={legend}>Objetivos</legend>
        <Checks name="goals" options={GOALS} selected={values.goals} />
        <VisibilitySelect name="goals_visibility" value={values.goals_visibility} label="tus objetivos" />
      </fieldset>

      <fieldset className={box}>
        <legend className={legend}>Comunicación</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(VOICE).map(([k, v]) => (
            <label key={k} className={chip}>
              <input type="radio" name="voice" value={k} defaultChecked={values.voice === k} className="size-4 accent-accent" />
              {v}
            </label>
          ))}
          <label className={chip}>
            <input type="radio" name="voice" value="" defaultChecked={values.voice == null} className="size-4 accent-accent" />
            Sin indicar
          </label>
        </div>
        <VisibilitySelect name="voice_visibility" value={values.voice_visibility} label="cómo te comunicas" />
      </fieldset>

      <fieldset className={box}>
        <legend className={legend}>VALORANT</legend>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium">
            Rango actual
            <select name="rank_id" defaultValue={values.rank_id ?? ""} className={control}>
              <option value="">Sin indicar</option>
              {catalog.ranks.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <span className="font-normal text-muted">Introducido manualmente: no está verificado con Riot.</span>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Servidor
            <select name="region_id" defaultValue={values.region_id ?? ""} className={control}>
              <option value="">Sin indicar</option>
              {catalog.regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="mt-5 text-sm font-medium">Modos que te interesan</p>
        <Checks name="modes" options={Object.fromEntries(catalog.modes.map((m) => [m.slug, m.name]))} selected={values.modes} />

        <p className="mt-5 text-sm font-medium">Roles que juegas</p>
        <Checks name="roles" options={Object.fromEntries(catalog.roles.map((r) => [r.id, r.name]))} selected={values.roles} />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium">
            Rol principal
            <select
              name="primary_role"
              defaultValue={values.primary_role ?? ""}
              aria-invalid={!!err.primary_role || undefined}
              aria-describedby={err.primary_role ? "primary_role-error" : undefined}
              className={control}
            >
              <option value="">Ninguno</option>
              {catalog.roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <FieldError id="primary_role-error" error={err.primary_role} />
          </label>
          <label className={`${chip} self-end`}>
            <input type="checkbox" name="flex" defaultChecked={values.flex} className="size-4 accent-accent" />
            Flex: me adapto al rol que falte
          </label>
        </div>

        <details className="mt-5" open={Object.keys(values.characters).length > 0}>
          <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">
            Pool de agentes ({Object.keys(values.characters).length} elegidos)
          </summary>
          <div className="mt-2 grid gap-6 sm:grid-cols-2">
            {catalog.roles.map((role) => (
              <div key={role.id}>
                <p className="eyebrow flex items-center gap-1.5 text-muted">
                  <RoleIcon slug={role.slug} className="size-3.5" />
                  {roleName.get(role.id)}
                </p>
                <ul className="mt-2 flex flex-col gap-2">
                  {catalog.characters
                    .filter((c) => c.role_id === role.id)
                    .map((c) => (
                      <li key={c.id}>
                        <label className="flex items-center justify-between gap-3 text-sm">
                          <span className="flex items-center gap-2">
                            <CharacterIcon name={c.name} src={c.icon_url} size={32} />
                            {c.name}
                          </span>
                          <select
                            name={`char:${c.id}`}
                            defaultValue={values.characters[c.id] ?? ""}
                            className={`${control} min-h-9 w-40 text-sm`}
                          >
                            <option value="">No lo juego</option>
                            {Object.entries(CHARACTER_STATUS).map(([k, v]) => (
                              <option key={k} value={k}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </label>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </details>

        <VisibilitySelect name="game_visibility" value={values.game_visibility} label="tu perfil de VALORANT" />
      </fieldset>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-4 border-t border-line bg-bg/95 px-4 py-3">
        <button
          type="submit"
          disabled={pending}
          className="btn-primary"
        >
          {pending ? "Guardando…" : "Guardar perfil"}
        </button>
        <p role="status" aria-live="polite" className={`text-sm ${state?.ok ? "text-success" : "text-danger"}`}>
          {state?.message}
        </p>
      </div>
    </form>
  );
}
