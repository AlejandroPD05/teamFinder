"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { browserClient } from "@/lib/supabase/client";
import { DM_MAX, dmError } from "@/lib/dm";
import { REPORT_REASONS } from "@/lib/trust/options";
import { reportDirectMessageAction, type DmState } from "../actions";

export type DirectMessage = { id: number; sender_id: string; body: string; created_at: string };

const time = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const control = "min-h-11 rounded-md border border-line bg-bg px-3 text-sm text-text focus:border-accent";

function ReportMessage({ messageId }: { messageId: number }) {
  const [state, action, pending] = useActionState<DmState, FormData>(reportDirectMessageAction, null);
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
        <label htmlFor={`dm-r-${messageId}`} className="font-medium">
          Motivo
        </label>
        <select id={`dm-r-${messageId}`} name="reason" defaultValue="" required className={control}>
          <option value="" disabled>
            Elige un motivo
          </option>
          {Object.entries(REPORT_REASONS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <label htmlFor={`dm-d-${messageId}`} className="font-medium">
          Detalles (opcional)
        </label>
        <textarea id={`dm-d-${messageId}`} name="details" maxLength={500} rows={2} className={`${control} py-2`} />
        <p className="text-xs text-muted">La persona denunciada no sabrá quién la ha denunciado.</p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="min-h-11 rounded-md border border-danger px-4 text-danger hover:bg-panel-hover"
          >
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

export function DirectChat({
  conversationId,
  me,
  otherName,
  initial,
  canWrite,
  closedReason,
}: {
  conversationId: string;
  me: string;
  otherName: string;
  initial: DirectMessage[];
  canWrite: boolean;
  closedReason: string;
}) {
  const [messages, setMessages] = useState(initial);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [live, setLive] = useState<"connecting" | "live" | "offline">("connecting");
  const listRef = useRef<HTMLOListElement>(null);

  // Tiempo real: Realtime solo entrega a las dos personas de la conversación (RLS de lectura).
  useEffect(() => {
    const supabase = browserClient();
    let cancelled = false;
    const channel = supabase.channel(`dm:${conversationId}`);
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) supabase.realtime.setAuth(data.session.access_token);
      if (cancelled) return;
      channel
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "direct_messages", filter: `conversation_id=eq.${conversationId}` },
          (payload) => {
            const m = payload.new as DirectMessage;
            setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
            void supabase.rpc("mark_direct_read", { p_conversation: conversationId });
          },
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") setLive("live");
          else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setLive("offline");
        });
    })();
    void supabase.rpc("mark_direct_read", { p_conversation: conversationId });
    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    listRef.current?.lastElementChild?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text || text.length > DM_MAX) {
      setError(dmError("invalid"));
      return;
    }
    setSending(true);
    setError("");
    const { data, error: err } = await browserClient().rpc("send_direct_message", {
      p_conversation: conversationId,
      p_body: text,
    });
    setSending(false);
    if (err) {
      setError(dmError(err.hint));
      return;
    }
    setBody("");
    const id = Number(data);
    setMessages((prev) =>
      prev.some((x) => x.id === id) ? prev : [...prev, { id, sender_id: me, body: text, created_at: new Date().toISOString() }],
    );
  }

  return (
    <section aria-label={`Conversación con ${otherName}`} className="flex flex-col gap-3 surface p-5">
      <p className="text-xs text-muted">
        {live === "live" ? "En directo" : live === "connecting" ? "Conectando…" : "Sin tiempo real: recarga para ver mensajes nuevos"}
        {" · "}Solo lo veis vosotros dos. No compartas datos personales ni contraseñas.
      </p>
      <ol
        ref={listRef}
        role="log"
        aria-live="polite"
        aria-label="Mensajes"
        className="flex max-h-[28rem] min-h-24 flex-col gap-2 overflow-y-auto rounded-md bg-bg p-3"
      >
        {messages.length === 0 && <li className="text-sm text-muted">Aún no hay mensajes. Saluda.</li>}
        {messages.map((m) => (
          <li key={m.id} className={`flex flex-col ${m.sender_id === me ? "items-end" : "items-start"}`}>
            <span className="text-xs text-muted">
              {m.sender_id === me ? "Tú" : otherName} · {time.format(new Date(m.created_at))}
            </span>
            <p
              className={`max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm ${
                m.sender_id === me ? "bg-panel-hover" : "bg-bg-raised"
              }`}
            >
              {m.body}
            </p>
            {m.sender_id !== me && <ReportMessage messageId={m.id} />}
          </li>
        ))}
      </ol>

      {canWrite ? (
        <form onSubmit={send} className="flex flex-col gap-2">
          <label htmlFor="dm-input" className="sr-only">
            Escribe un mensaje
          </label>
          <div className="flex gap-2">
            <input
              id="dm-input"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={DM_MAX}
              placeholder="Escribe un mensaje…"
              autoComplete="off"
              aria-describedby={error ? "dm-error" : undefined}
              className="min-h-11 min-w-0 flex-1 rounded-md border border-line bg-bg px-3 text-text focus:border-accent"
            />
            <button type="submit" disabled={sending} className="btn-primary">
              Enviar
            </button>
          </div>
          {error && (
            <p id="dm-error" role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
        </form>
      ) : (
        <p className="text-sm text-muted">{closedReason}</p>
      )}
    </section>
  );
}
