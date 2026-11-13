"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { browserClient } from "@/lib/supabase/client";
import { teamError } from "@/lib/teams";
import { REPORT_REASONS } from "@/lib/trust/options";
import { reportTeamMessageAction, type TeamState } from "../../mis-equipos/actions";

export type TeamMessage = { id: number; user_id: string; body: string; created_at: string };

const time = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const control = "min-h-11 rounded-md border border-line bg-bg px-3 text-sm text-text focus:border-accent";

function ReportMessage({ messageId }: { messageId: number }) {
  const [state, action, pending] = useActionState<TeamState, FormData>(reportTeamMessageAction, null);
  if (state?.ok)
    return (
      <p role="status" className="text-xs text-success">
        {state.message}
      </p>
    );
  return (
    <details className="text-xs">
      <summary className="min-h-11 cursor-pointer py-2 text-muted hover:text-text">Denunciar mensaje</summary>
      <form action={action} className="mt-1 flex flex-col gap-2 rounded-md border border-line bg-bg p-3 text-sm">
        <input type="hidden" name="message_id" value={messageId} />
        <label htmlFor={`tm-r-${messageId}`} className="font-medium">
          Motivo
        </label>
        <select id={`tm-r-${messageId}`} name="reason" defaultValue="" required className={control}>
          <option value="" disabled>
            Elige un motivo
          </option>
          {Object.entries(REPORT_REASONS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <label htmlFor={`tm-d-${messageId}`} className="font-medium">
          Detalles (opcional)
        </label>
        <textarea id={`tm-d-${messageId}`} name="details" maxLength={500} rows={2} className={`${control} py-2`} />
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending} className="min-h-11 rounded-md border border-danger px-4 text-danger hover:bg-panel-hover">
            Enviar denuncia
          </button>
          {state && (
            <p role="alert" className="text-danger">
              {state.message}
            </p>
          )}
        </div>
      </form>
    </details>
  );
}

/** Chat del equipo en tiempo real: Realtime solo entrega a los miembros (RLS de lectura). */
export function TeamChat({ teamId, me, initial, names: initialNames }: { teamId: string; me: string; initial: TeamMessage[]; names: Record<string, string> }) {
  const [messages, setMessages] = useState(initial);
  const [names, setNames] = useState(initialNames);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [live, setLive] = useState<"connecting" | "live" | "offline">("connecting");
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const supabase = browserClient();
    let cancelled = false;
    const channel = supabase.channel(`team:${teamId}`);
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) supabase.realtime.setAuth(data.session.access_token);
      if (cancelled) return;
      channel
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "team_messages", filter: `team_id=eq.${teamId}` }, (payload) => {
          const m = payload.new as TeamMessage;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") setLive("live");
          else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setLive("offline");
        });
    })();
    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [teamId]);

  // Nombres de quien entra nuevo al equipo.
  useEffect(() => {
    const unknown = [...new Set(messages.map((m) => m.user_id))].filter((id) => !names[id]);
    if (unknown.length === 0) return;
    void browserClient()
      .from("profile_cards")
      .select("id, display_name")
      .in("id", unknown)
      .then(({ data }) => {
        if (data?.length) setNames((n) => ({ ...n, ...Object.fromEntries(data.map((p) => [p.id!, p.display_name ?? "Jugador"])) }));
      });
  }, [messages, names]);

  useEffect(() => {
    listRef.current?.lastElementChild?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text || text.length > 500) {
      setError(teamError("invalid"));
      return;
    }
    setSending(true);
    setError("");
    const { data, error: err } = await browserClient().rpc("send_team_message", { p_team: teamId, p_body: text });
    setSending(false);
    if (err) {
      setError(teamError(err.hint));
      return;
    }
    setBody("");
    const id = Number(data);
    setMessages((prev) => (prev.some((x) => x.id === id) ? prev : [...prev, { id, user_id: me, body: text, created_at: new Date().toISOString() }]));
  }

  return (
    <section aria-labelledby="chat-equipo" className="flex flex-col gap-3 surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="chat-equipo" className="font-semibold">
          Chat del equipo
        </h2>
        <span className="text-xs text-muted">
          {live === "live" ? "En directo" : live === "connecting" ? "Conectando…" : "Sin tiempo real: recarga para ver mensajes nuevos"}
        </span>
      </div>
      <p className="text-xs text-muted">Solo lo ven los miembros del equipo. No compartas datos personales ni contraseñas.</p>
      <ol ref={listRef} role="log" aria-live="polite" aria-label="Mensajes del equipo" className="flex max-h-96 min-h-24 flex-col gap-2 overflow-y-auto rounded-md bg-bg p-3">
        {messages.length === 0 && <li className="text-sm text-muted">Aún no hay mensajes. Organizad la próxima partida.</li>}
        {messages.map((m) => (
          <li key={m.id} className={`flex flex-col ${m.user_id === me ? "items-end" : "items-start"}`}>
            <span className="text-xs text-muted">
              {m.user_id === me ? "Tú" : (names[m.user_id] ?? "Jugador")} · {time.format(new Date(m.created_at))}
            </span>
            <p className={`max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm ${m.user_id === me ? "bg-panel-hover" : "bg-bg-raised"}`}>
              {m.body}
            </p>
            {m.user_id !== me && <ReportMessage messageId={m.id} />}
          </li>
        ))}
      </ol>
      <form onSubmit={send} className="flex flex-col gap-2">
        <label htmlFor="team-chat-input" className="sr-only">
          Escribe un mensaje
        </label>
        <div className="flex gap-2">
          <input
            id="team-chat-input"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={500}
            placeholder="Escribe un mensaje…"
            autoComplete="off"
            aria-describedby={error ? "team-chat-error" : undefined}
            className="min-h-11 min-w-0 flex-1 rounded-md border border-line bg-bg px-3 text-text focus:border-accent"
          />
          <button type="submit" disabled={sending} className="btn-primary">
            Enviar
          </button>
        </div>
        {error && (
          <p id="team-chat-error" role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
