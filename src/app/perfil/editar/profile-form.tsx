"use client";

import { useActionState, useState, type FormEvent } from "react";
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
import { SOCIALS } from "@/lib/profile/schema";
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
  social_twitch: string | null;
  social_youtube: string | null;
  social_x: string | null;
  socials_visibility: Visibility;
  dm_policy: "registered" | "none";
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
  "flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-line px-3 text-sm has-[:checked]:border-accent has-[:checked]:bg-panel-hover";

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

export function ProfileForm({
  catalog,
  values,
  gameName,
  characterLabel,
}: {
  catalog: Catalog;
  values: ProfileFormValues;
  gameName: string;
  characterLabel: string | null;
}) {
  const [state, action, pending] = useActionState<SaveState, FormData>(saveProfile, null);
  const err = state?.fieldErrors ?? {};
  const roleName = new Map(catalog.roles.map((r) => [r.id, r.name]));
  // Cuántos personajes hay elegidos ahora mismo en el formulario (no solo los guardados al cargar la página).
  const [picked, setPicked] = useState(Object.keys(values.characters).length);
  const countPicked = (e: FormEvent<HTMLElement>) =>
    setPicked(
      [...e.currentTarget.querySelectorAll<HTMLSelectElement>('select[name^="char:"]')].filter((s) => s.value !== "").length,
    );

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
        <legend className={legend}>Redes sociales</legend>
        <p className="mt-1 text-sm text-muted">Opcional. Solo el nombre de usuario; el enlace lo ponemos nosotros.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {(Object.keys(SOCIALS) as (keyof typeof SOCIALS)[]).map((k) => (
            <div key={k}>
              <label htmlFor={k} className="block text-sm font-medium">
                {SOCIALS[k].label}
              </label>
              <input
                id={k}
                name={k}
                defaultValue={values[k] ?? ""}
                maxLength={31}
                autoComplete="off"
                spellCheck={false}
                placeholder="usuario"
                aria-invalid={!!err[k] || undefined}
                aria-describedby={err[k] ? `${k}-error` : undefined}
                className={`${control} mt-2 w-full`}
              />
              <FieldError id={`${k}-error`} error={err[k]} />
            </div>
          ))}
        </div>
        <VisibilitySelect name="socials_visibility" value={values.socials_visibility} label="tus redes" />
      </fieldset>

      <fieldset className={box}>
        <legend className={legend}>Mensajes privados</legend>
        <div className="mt-3 flex flex-col gap-2">
          <label className={chip}>
            <input type="radio" name="dm_policy" value="registered" defaultChecked={values.dm_policy === "registered"} className="size-4 accent-accent" />
            Cualquier jugador con cuenta puede escribirme
          </label>
          <label className={chip}>
            <input type="radio" name="dm_policy" value="none" defaultChecked={values.dm_policy === "none"} className="size-4 accent-accent" />
            Nadie puede empezar una conversación conmigo
          </label>
        </div>
        <p className="mt-2 text-sm text-muted">Las conversaciones que ya tienes siguen abiertas. Bloquear a alguien corta la conversación.</p>
      </fieldset>

      <fieldset className={box}>
        <legend className={legend}>{gameName}</legend>
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
            <span className="font-normal text-muted">Introducido manualmente: no está verificado con el juego.</span>
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

        {characterLabel && catalog.characters.length > 0 && (
        <details className="mt-5" open={Object.keys(values.characters).length > 0} onChange={countPicked}>
          <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">
            Pool de {characterLabel.toLowerCase()} ({picked} {picked === 1 ? "elegido" : "elegidos"})
          </summary>
          <div className="mt-2 grid gap-6 sm:grid-cols-2">
            {catalog.roles.map((role) => (
              <div key={role.id}>
                <p className="flex items-center gap-1.5 text-sm font-medium text-muted">
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
        )}

        <VisibilitySelect name="game_visibility" value={values.game_visibility} label={`tu perfil de ${gameName}`} />
      </fieldset>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-4 border-t border-line bg-bg px-4 py-3">
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
