"use client";

import { CalendarPlus } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useActionState, useRef } from "react";
import { INTL_LOCALE } from "@/lib/i18n/locale";
import { outcomeOf, useStickyForm } from "@/lib/use-sticky-form";
import { createEventAction, deleteEventAction, eventLobbyAction, rsvpAction, type TeamState } from "../../mis-equipos/actions";

export type TeamEvent = {
  id: string;
  starts_at: string;
  note: string | null;
  created_by: string | null;
  lobby_id: string | null;
  rsvps: { user_id: string; answer: "yes" | "maybe" | "no" }[];
};

const control = "min-h-11 rounded-md border border-line bg-bg px-3 text-text focus:border-accent";
const ANSWERS = ["yes", "maybe", "no"] as const;

function Status({ state }: { state: TeamState }) {
  return (
    <p role="status" aria-live="polite" className={`text-sm ${state?.ok ? "text-success" : "text-danger"}`}>
      {state?.message}
    </p>
  );
}

/** Proponer quedada: la hora se elige en la del navegador y se envía como instante exacto (ISO). */
export function CreateEventForm({ teamId }: { teamId: string }) {
  const [state, action, pending] = useActionState<TeamState, FormData>(createEventAction, null);
  const isoRef = useRef<HTMLInputElement>(null);
  const { ref: formRef, onSubmit: send } = useStickyForm(action, state, outcomeOf(state), { resetOnSuccess: true });
  const t = useTranslations("teamEvents");
  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={(e) => {
        const local = (e.currentTarget.elements.namedItem("local_start") as HTMLInputElement).value;
        if (isoRef.current) isoRef.current.value = local ? new Date(local).toISOString() : "";
        send(e);
      }}
      className="flex flex-col gap-3 rounded-md border border-line bg-bg p-4"
    >
      <input type="hidden" name="team_id" value={teamId} />
      <input ref={isoRef} type="hidden" name="starts_at" />
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">{t("dateTime")}</span>
          <input name="local_start" type="datetime-local" required className={control} />
        </label>
        <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm">
          <span className="font-medium">{t("note")}</span>
          <input name="note" maxLength={200} placeholder={t("notePlaceholder")} className={`${control} w-full`} />
        </label>
        <button type="submit" disabled={pending} className="btn-primary">
          {t("propose")}
        </button>
      </div>
      <Status state={state} />
    </form>
  );
}

function Rsvp({ event, teamId, mine }: { event: TeamEvent; teamId: string; mine: string | undefined }) {
  const [state, action, pending] = useActionState<TeamState, FormData>(rsvpAction, null);
  const t = useTranslations("teamEvents");
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="event_id" value={event.id} />
      <input type="hidden" name="team_id" value={teamId} />
      {ANSWERS.map((a) => (
        <button
          key={a}
          type="submit"
          name="answer"
          value={a}
          disabled={pending}
          aria-pressed={mine === a}
          className={`min-h-11 rounded-md border px-3 text-sm ${mine === a ? "border-accent bg-panel-hover font-medium" : "border-line hover:bg-panel-hover"}`}
        >
          {t(`answers.${a}`)}
        </button>
      ))}
      {state && !state.ok && <Status state={state} />}
    </form>
  );
}

function MakeLobby({ eventId, modes }: { eventId: string; modes: { slug: string; name: string }[] }) {
  const [state, action, pending] = useActionState<TeamState, FormData>(eventLobbyAction, null);
  const t = useTranslations("teamEvents");
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="event_id" value={eventId} />
      <label htmlFor={`mode-${eventId}`} className="sr-only">
        {t("lobbyMode")}
      </label>
      <select id={`mode-${eventId}`} name="mode" className={control}>
        {modes.map((m) => (
          <option key={m.slug} value={m.slug}>
            {m.name}
          </option>
        ))}
      </select>
      <button type="submit" disabled={pending} className="btn-ghost">
        {t("makeLobby")}
      </button>
      {state && !state.ok && <Status state={state} />}
    </form>
  );
}

function DeleteEvent({ eventId, teamId, label }: { eventId: string; teamId: string; label: string }) {
  const [state, action, pending] = useActionState<TeamState, FormData>(deleteEventAction, null);
  const t = useTranslations("teamEvents");
  return (
    <form action={action}>
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="team_id" value={teamId} />
      <button type="submit" disabled={pending} aria-label={t("deleteLabel", { when: label })} className="min-h-11 rounded-md px-3 text-sm text-muted hover:bg-panel-hover hover:text-text">
        {t("delete")}
      </button>
      {state && !state.ok && <Status state={state} />}
    </form>
  );
}

export function TeamEvents({
  teamId,
  me,
  isOwner,
  events,
  names,
  modes,
}: {
  teamId: string;
  me: string;
  isOwner: boolean;
  events: TeamEvent[];
  names: Record<string, string>;
  modes: { slug: string; name: string }[];
}) {
  const t = useTranslations("teamEvents");
  const when = new Intl.DateTimeFormat(INTL_LOCALE[useLocale()], { timeZone: "Europe/Madrid", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  return (
    <section aria-labelledby="quedadas" className="flex flex-col gap-3 surface p-5">
      <h2 id="quedadas" className="font-semibold">
        {t("title")}
      </h2>
      <p className="text-sm text-muted">{t("lead")}</p>
      <CreateEventForm teamId={teamId} />
      {events.some((e) => new Date(e.starts_at) > new Date()) && (
        <a href={`/equipo/${teamId}/calendario`} download className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm text-accent-soft underline underline-offset-4">
          <CalendarPlus aria-hidden="true" className="size-4" />
          {t("addToCalendar")}
        </a>
      )}
      {events.length === 0 ? (
        <p className="text-sm text-muted">{t("none")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {events.map((e) => {
            const going = e.rsvps.filter((r) => r.answer === "yes");
            const maybe = e.rsvps.filter((r) => r.answer === "maybe").length;
            const canManage = isOwner || e.created_by === me;
            return (
              <li key={e.id} className="flex flex-col gap-2 rounded-md border border-line p-3">
                <p className="font-semibold first-letter:uppercase">{when.format(new Date(e.starts_at))}</p>
                {e.note && <p className="text-sm">{e.note}</p>}
                <p className="text-sm text-muted">
                  {t("going", { count: going.length })}
                  {going.length > 0 && `: ${going.map((r) => (r.user_id === me ? t("you") : (names[r.user_id] ?? t("player")))).join(", ")}`}
                  {maybe > 0 && ` · ${t("maybe", { count: maybe })}`}
                </p>
                <Rsvp event={e} teamId={teamId} mine={e.rsvps.find((r) => r.user_id === me)?.answer} />
                {e.lobby_id ? (
                  <Link href={`/grupos/${e.lobby_id}`} className="inline-flex min-h-11 items-center text-sm text-accent-soft underline underline-offset-4">
                    {t("goToLobby")}
                  </Link>
                ) : (
                  canManage && <MakeLobby eventId={e.id} modes={modes} />
                )}
                {canManage && <DeleteEvent eventId={e.id} teamId={teamId} label={when.format(new Date(e.starts_at))} />}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
