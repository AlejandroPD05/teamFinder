"use client";

import { useEffect, useRef, useState } from "react";
import { browserClient } from "@/lib/supabase/client";
import { ReportForm } from "../../confianza/forms";

export type ChatMessage = { id: number; user_id: string; body: string; created_at: string };

const ERRORS: Record<string, string> = {
  rate_limited: "Vas demasiado rápido. Espera unos segundos.",
  closed: "El grupo está cerrado: la sala es de solo lectura.",
  not_member: "Ya no eres miembro de este grupo.",
  invalid: "El mensaje debe tener entre 1 y 500 caracteres.",
};

const time = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" });

export function LobbyChat({
  lobbyId,
  me,
  initial,
  names: initialNames,
  closed,
}: {
  lobbyId: string;
  me: string;
  initial: ChatMessage[];
  names: Record<string, string>;
  closed: boolean;
}) {
  const [messages, setMessages] = useState(initial);
  const [names, setNames] = useState(initialNames);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [live, setLive] = useState<"connecting" | "live" | "offline">("connecting");
  const listRef = useRef<HTMLOListElement>(null);

  // Tiempo real: Realtime solo entrega a miembros (aplica la RLS de lectura).
  useEffect(() => {
    const supabase = browserClient();
    let cancelled = false;
    const channel = supabase.channel(`lobby:${lobbyId}`);
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) supabase.realtime.setAuth(data.session.access_token);
      if (cancelled) return;
      channel
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "lobby_messages", filter: `lobby_id=eq.${lobbyId}` },
          (payload) => {
            const m = payload.new as ChatMessage;
            setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
            void supabase.rpc("mark_read", { p_lobby: lobbyId });
          },
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") setLive("live");
          else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setLive("offline");
        });
    })();
    void supabase.rpc("mark_read", { p_lobby: lobbyId });
    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [lobbyId]);

  // Nombres de remitentes nuevos (p. ej. alguien que acaba de entrar).
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
      setError(ERRORS.invalid);
      return;
    }
    setSending(true);
    setError("");
    const supabase = browserClient();
    const { data, error: err } = await supabase.rpc("send_message", { p_lobby: lobbyId, p_body: text });
    setSending(false);
    if (err) {
      setError(ERRORS[err.hint ?? ""] ?? "No se pudo enviar. Inténtalo de nuevo.");
      return;
    }
    setBody("");
    const id = Number(data);
    setMessages((prev) =>
      prev.some((x) => x.id === id) ? prev : [...prev, { id, user_id: me, body: text, created_at: new Date().toISOString() }],
    );
  }

  return (
    <section aria-labelledby="chat" className="flex flex-col gap-3 surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="chat" className="font-semibold">
          Chat del grupo
        </h2>
        <span className="text-xs text-muted">
          {live === "live" ? "En directo" : live === "connecting" ? "Conectando…" : "Sin tiempo real: recarga para ver mensajes nuevos"}
        </span>
      </div>
      <p className="text-xs text-muted">Solo lo ven los miembros del grupo. Sé respetuoso: no compartas datos personales.</p>

      <ol
        ref={listRef}
        role="log"
        aria-live="polite"
        aria-label="Mensajes del grupo"
        className="flex max-h-96 min-h-24 flex-col gap-2 overflow-y-auto rounded-md bg-bg p-3"
      >
        {messages.length === 0 && <li className="text-sm text-muted">Aún no hay mensajes. Saluda y coordinad la partida.</li>}
        {messages.map((m) => (
          <li key={m.id} className={`flex flex-col ${m.user_id === me ? "items-end" : "items-start"}`}>
            <span className="text-xs text-muted">
              {m.user_id === me ? "Tú" : (names[m.user_id] ?? "Jugador")} · {time.format(new Date(m.created_at))}
            </span>
            <p
              className={`max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm ${
                m.user_id === me ? "bg-accent/20" : "bg-panel"
              }`}
            >
              {m.body}
            </p>
            {m.user_id !== me && <ReportForm targetId={m.user_id} messageId={m.id} lobbyId={lobbyId} label="Denunciar mensaje" />}
          </li>
        ))}
      </ol>

      {closed ? (
        <p className="text-sm text-muted">El grupo está cerrado: la sala es de solo lectura.</p>
      ) : (
        <form onSubmit={send} className="flex flex-col gap-2">
          <label htmlFor="chat-input" className="sr-only">
            Escribe un mensaje
          </label>
          <div className="flex gap-2">
            <input
              id="chat-input"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={500}
              placeholder="Escribe un mensaje…"
              autoComplete="off"
              aria-describedby={error ? "chat-error" : undefined}
              className="min-h-11 flex-1 rounded-md border border-line bg-bg px-3 text-text focus:border-accent"
            />
            <button
              type="submit"
              disabled={sending}
              className="btn-primary"
            >
              Enviar
            </button>
          </div>
          {error && (
            <p id="chat-error" role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
