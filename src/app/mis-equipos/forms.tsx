"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import {
  cancelInviteAction,
  createTeamAction,
  deleteTeamAction,
  inviteAction,
  leaveTeamAction,
  respondInviteAction,
  updateTeamAction,
  type TeamState,
} from "./actions";

const control = "min-h-11 w-full rounded-md border border-line bg-bg px-3 text-text focus:border-accent";
const btn = "min-h-11 rounded-md px-4 text-sm disabled:opacity-60";

function Status({ state }: { state: TeamState }) {
  return (
    <p role="status" aria-live="polite" className={`text-sm ${state?.ok ? "text-success" : "text-danger"}`}>
      {state?.message}
    </p>
  );
}

function TeamFields({ name = "", description = "" }: { name?: string; description?: string }) {
  const t = useTranslations("teams");
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="team-name" className="text-sm font-medium">
          {t("name")}
        </label>
        <input id="team-name" name="name" required minLength={3} maxLength={32} defaultValue={name} className={control} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="team-description" className="text-sm font-medium">
          {t("description")}
        </label>
        <input id="team-description" name="description" maxLength={200} defaultValue={description} className={control} />
      </div>
    </>
  );
}

export function CreateTeamForm({ gameName }: { gameName: string }) {
  const [state, action, pending] = useActionState<TeamState, FormData>(createTeamAction, null);
  const t = useTranslations("teams");
  return (
    <form action={action} className="flex flex-col gap-3 surface p-5">
      <h2 className="font-semibold">{t("createTitle", { game: gameName })}</h2>
      <TeamFields />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary">
          {t("create")}
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}

export function EditTeamForm({ teamId, name, description }: { teamId: string; name: string; description: string }) {
  const [state, action, pending] = useActionState<TeamState, FormData>(updateTeamAction, null);
  const t = useTranslations("teams");
  return (
    <details className="text-sm">
      <summary className="min-h-11 cursor-pointer py-2 text-muted hover:text-text">{t("edit")}</summary>
      <form action={action} className="mt-2 flex flex-col gap-3 rounded-md border border-line bg-bg p-3">
        <input type="hidden" name="team_id" value={teamId} />
        <TeamFields name={name} description={description} />
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending} className={`${btn} border border-line hover:bg-panel-hover`}>
            {t("save")}
          </button>
          <Status state={state} />
        </div>
      </form>
    </details>
  );
}

/** En el perfil de un jugador: invitarle a uno de tus equipos de este juego. */
export function InviteToTeam({ userId, teams }: { userId: string; teams: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<TeamState, FormData>(inviteAction, null);
  const t = useTranslations("teams");
  if (state?.ok) return <Status state={state} />;
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="user_id" value={userId} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="invite-team" className="text-sm font-medium">
          {t("inviteLabel")}
        </label>
        <select id="invite-team" name="team_id" className="min-h-11 rounded-md border border-line bg-bg px-3 text-text focus:border-accent">
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" disabled={pending} className={`${btn} border border-line hover:bg-panel-hover`}>
        {t("invite")}
      </button>
      <Status state={state} />
    </form>
  );
}

export function RespondInvite({ inviteId, teamName }: { inviteId: string; teamName: string }) {
  const [state, action, pending] = useActionState<TeamState, FormData>(respondInviteAction, null);
  const t = useTranslations("teams");
  if (state?.ok) return <Status state={state} />;
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="invite_id" value={inviteId} />
      <button
        type="submit"
        name="decision"
        value="accept"
        disabled={pending}
        aria-label={t("acceptLabel", { team: teamName })}
        className={`${btn} bg-accent font-semibold text-bg`}
      >
        {t("accept")}
      </button>
      <button
        type="submit"
        name="decision"
        value="decline"
        disabled={pending}
        aria-label={t("declineLabel", { team: teamName })}
        className={`${btn} border border-line hover:bg-panel-hover`}
      >
        {t("decline")}
      </button>
      <Status state={state} />
    </form>
  );
}

export function CancelInvite({ inviteId, teamId, name }: { inviteId: string; teamId: string; name: string }) {
  const [state, action, pending] = useActionState<TeamState, FormData>(cancelInviteAction, null);
  const t = useTranslations("teams");
  if (state?.ok) return <Status state={state} />;
  return (
    <form action={action}>
      <input type="hidden" name="invite_id" value={inviteId} />
      <input type="hidden" name="team_id" value={teamId} />
      <button type="submit" disabled={pending} aria-label={t("cancelLabel", { name })} className={`${btn} text-muted hover:bg-panel-hover`}>
        {t("cancel")}
      </button>
    </form>
  );
}

/** Salir del equipo, o (con `userId`, para el dueño) sacar a alguien. */
export function LeaveTeam({ teamId, userId, name }: { teamId: string; userId?: string; name?: string }) {
  const [state, action, pending] = useActionState<TeamState, FormData>(leaveTeamAction, null);
  const t = useTranslations("teams");
  if (state?.ok) return <Status state={state} />;
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(userId ? t("kickConfirm", { name: name ?? "" }) : t("leaveConfirm"))) e.preventDefault();
      }}
    >
      <input type="hidden" name="team_id" value={teamId} />
      {userId && <input type="hidden" name="user_id" value={userId} />}
      <button type="submit" disabled={pending} className={`${btn} border border-line hover:bg-panel-hover`}>
        {userId ? t("kick") : t("leave")}
        {userId && <span className="sr-only"> {t("kickWho", { name: name ?? "" })}</span>}
      </button>
      {state && <Status state={state} />}
    </form>
  );
}

export function DeleteTeam({ teamId, name }: { teamId: string; name: string }) {
  const [state, action, pending] = useActionState<TeamState, FormData>(deleteTeamAction, null);
  const t = useTranslations("teams");
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(t("deleteConfirm", { name }))) e.preventDefault();
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="team_id" value={teamId} />
      <button type="submit" disabled={pending} className={`${btn} border border-danger text-danger hover:bg-panel-hover`}>
        {t("delete")}
      </button>
      {state && <Status state={state} />}
    </form>
  );
}
