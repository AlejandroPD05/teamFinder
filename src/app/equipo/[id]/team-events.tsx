"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";
import { createEventAction, deleteEventAction, eventLobbyAction, rsvpAction, type TeamState } from "../../mis-equipos/actions";

export type TeamEvent = {
  id: string;
  starts_at: string;
  note: string | null;
  created_by: string | null;
  lobby_id: string | null;
  rsvps: { user_id: string; answer: "yes" | "maybe" | "no" }[];
};

const when = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
const control = "min-h-11 rounded-md border border-line bg-bg px-3 text-text focus:border-accent";
const ANSWERS = { yes: "Voy", maybe: "Quizá", no: "No puedo" } as const;

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
  return (
    <form
      action={action}
      onSubmit={(e) => {
        const local = (e.currentTarget.elements.namedItem("local_start") as HTMLInputElement).value;
        if (isoRef.current) isoRef.current.value = local ? new Date(local).toISOString() : "";
      }}
      className="flex flex-col gap-3 rounded-md border border-line bg-bg p-4"
    >
      <input type="hidden" name="team_id" value={teamId} />
      <input ref={isoRef} type="hidden" name="starts_at" />
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Día y hora</span>
          <input name="local_start" type="datetime-local" required className={control} />
        </label>
        <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm">
          <span className="font-medium">Nota (opcional)</span>
          <input name="note" maxLength={200} placeholder="Ranked, scrim, wingman…" className={`${control} w-full`} />
        </label>
        <button type="submit" disabled={pending} className="btn-primary">
          Proponer quedada
        </button>
      </div>
      <Status state={state} />
    </form>
  );
}

function Rsvp({ event, teamId, mine }: { event: TeamEvent; teamId: string; mine: string | undefined }) {
  const [state, action, pending] = useActionState<TeamState, FormData>(rsvpAction, null);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="event_id" value={event.id} />
      <input type="hidden" name="team_id" value={teamId} />
      {(Object.keys(ANSWERS) as (keyof typeof ANSWERS)[]).map((a) => (
        <button
          key={a}
          type="submit"
          name="answer"
          value={a}
          disabled={pending}
          aria-pressed={mine === a}
          className={`min-h-11 rounded-md border px-3 text-sm ${mine === a ? "border-accent bg-panel-hover font-medium" : "border-line hover:bg-panel-hover"}`}
        >
          {ANSWERS[a]}
        </button>
      ))}
      {state && !state.ok && <Status state={state} />}
    </form>
  );
}

function MakeLobby({ eventId, modes }: { eventId: string; modes: { slug: string; name: string }[] }) {
  const [state, action, pending] = useActionState<TeamState, FormData>(eventLobbyAction, null);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="event_id" value={eventId} />
      <label htmlFor={`mode-${eventId}`} className="sr-only">
        Modo del grupo
      </label>
      <select id={`mode-${eventId}`} name="mode" className={control}>
        {modes.map((m) => (
          <option key={m.slug} value={m.slug}>
            {m.name}
          </option>
        ))}
      </select>
      <button type="submit" disabled={pending} className="btn-ghost">
        Crear grupo con los que van
      </button>
      {state && !state.ok && <Status state={state} />}
    </form>
  );
}

function DeleteEvent({ eventId, teamId }: { eventId: string; teamId: string }) {
  const [state, action, pending] = useActionState<TeamState, FormData>(deleteEventAction, null);
  return (
    <form action={action}>
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="team_id" value={teamId} />
      <button type="submit" disabled={pending} className="min-h-11 rounded-md px-3 text-sm text-muted hover:bg-panel-hover hover:text-text">
        Borrar quedada
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
  return (
    <section aria-labelledby="quedadas" className="flex flex-col gap-3 surface p-5">
      <h2 id="quedadas" className="font-semibold">
        Quedadas
      </h2>
      <p className="text-sm text-muted">Propón día y hora, cada cual responde y, cuando estéis, se crea el grupo con los que van.</p>
      <CreateEventForm teamId={teamId} />
      {events.length === 0 ? (
        <p className="text-sm text-muted">No hay quedadas próximas.</p>
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
                  {going.length} {going.length === 1 ? "va" : "van"}
                  {going.length > 0 && `: ${going.map((r) => (r.user_id === me ? "tú" : (names[r.user_id] ?? "Jugador"))).join(", ")}`}
                  {maybe > 0 && ` · ${maybe} quizá`}
                </p>
                <Rsvp event={e} teamId={teamId} mine={e.rsvps.find((r) => r.user_id === me)?.answer} />
                {e.lobby_id ? (
                  <Link href={`/grupos/${e.lobby_id}`} className="text-sm text-accent-soft underline underline-offset-4">
                    Ir al grupo de esta quedada
                  </Link>
                ) : (
                  canManage && <MakeLobby eventId={e.id} modes={modes} />
                )}
                {canManage && <DeleteEvent eventId={e.id} teamId={teamId} />}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
