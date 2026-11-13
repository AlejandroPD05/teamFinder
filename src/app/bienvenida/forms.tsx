"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { RoleIcon } from "@/components/game-icons";
import { saveWelcomeRank, saveWelcomeRoles, type WelcomeState } from "./actions";

const control = "min-h-11 w-full rounded-md border border-line bg-bg px-3 text-text focus:border-accent";
const chip = "flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-line px-3 text-sm has-[:checked]:border-accent has-[:checked]:bg-panel-hover";

function Status({ state }: { state: WelcomeState }) {
  return state && !state.ok ? (
    <p role="alert" className="text-sm text-danger">
      {state.message}
    </p>
  ) : null;
}

export function RolesStep({ roles, selected, primary }: { roles: { id: string; slug: string; name: string }[]; selected: string[]; primary: string | null }) {
  const [state, action, pending] = useActionState<WelcomeState, FormData>(saveWelcomeRoles, null);
  const t = useTranslations("welcome");
  return (
    <form action={action} className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-medium">{t("rolesQuestion")}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {roles.map((r) => (
            <label key={r.id} className={chip}>
              <input type="checkbox" name="roles" value={r.id} defaultChecked={selected.includes(r.id)} className="size-4 accent-accent" />
              <RoleIcon slug={r.slug} className="size-4 text-muted" />
              {r.name}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-medium">{t("primaryQuestion")}</legend>
        <div className="flex flex-wrap gap-2">
          {roles.map((r) => (
            <label key={r.id} className={chip}>
              <input type="radio" name="primary" value={r.id} defaultChecked={primary === r.id} className="size-4 accent-accent" />
              {r.name}
            </label>
          ))}
        </div>
      </fieldset>
      <Status state={state} />
      <button type="submit" disabled={pending} className="btn-primary self-start">
        {t("next")}
      </button>
    </form>
  );
}

export function RankStep({
  name,
  ranks,
  regions,
  rankId,
  regionId,
}: {
  name: string;
  ranks: { id: string; name: string }[];
  regions: { id: string; name: string }[];
  rankId: string | null;
  regionId: string | null;
}) {
  const [state, action, pending] = useActionState<WelcomeState, FormData>(saveWelcomeRank, null);
  const t = useTranslations("welcome");
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="welcome-name" className="font-medium">
          {t("name")}
        </label>
        <input id="welcome-name" name="display_name" defaultValue={name} required minLength={2} maxLength={32} className={control} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="welcome-rank" className="font-medium">
            {t("rank")}
          </label>
          <select id="welcome-rank" name="rank_id" defaultValue={rankId ?? ""} className={control}>
            <option value="">{t("rankNone")}</option>
            {ranks.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="welcome-region" className="font-medium">
            {t("region")}
          </label>
          <select id="welcome-region" name="region_id" defaultValue={regionId ?? ""} className={control}>
            <option value="">{t("unset")}</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-xs text-muted">{t("rankNote")}</p>
      <Status state={state} />
      <button type="submit" disabled={pending} className="btn-primary self-start">
        {t("finish")}
      </button>
    </form>
  );
}
