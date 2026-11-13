"use client";

import { useEffect, useState } from "react";
import { deletePushSubscription, savePushSubscription } from "./actions";

type Status = "checking" | "unsupported" | "unconfigured" | "denied" | "off" | "on";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

/** La clave pública VAPID viene en base64url; el navegador la quiere en bytes. */
function keyBytes(base64url: string) {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Notificaciones push en este dispositivo: se activan aquí y llegan aunque la web esté cerrada. */
export function PushSettings() {
  const [status, setStatus] = useState<Status>("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setStatus("unsupported");
      if (!VAPID) return setStatus("unconfigured");
      if (Notification.permission === "denied") return setStatus("denied");
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setStatus(sub ? "on" : "off");
    })().catch(() => setStatus("unsupported"));
  }, []);

  async function enable() {
    setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID) });
      const { ok } = await savePushSubscription(sub.toJSON());
      if (!ok) {
        await sub.unsubscribe();
        setMessage("No se pudo activar. Inténtalo de nuevo.");
        return;
      }
      setStatus("on");
      setMessage("Activadas en este dispositivo.");
    } catch {
      setMessage("Tu navegador no ha dejado activarlas. Si usas iPhone, instala primero la web en la pantalla de inicio.");
    }
  }

  async function disable() {
    setMessage("");
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await deletePushSubscription(sub.endpoint);
      await sub.unsubscribe();
    }
    setStatus("off");
    setMessage("Desactivadas en este dispositivo.");
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-sm">
        {status === "checking" && "Comprobando…"}
        {status === "unsupported" && "Este navegador no admite notificaciones push."}
        {status === "unconfigured" && "Las notificaciones push aún no están disponibles en la web."}
        {status === "denied" && "Has bloqueado las notificaciones para esta web: actívalas en los ajustes del navegador."}
        {status === "off" && (
          <>
            Ahora mismo: <strong>desactivadas</strong> en este dispositivo.
          </>
        )}
        {status === "on" && (
          <>
            Ahora mismo: <strong>activadas</strong> en este dispositivo.
          </>
        )}
      </p>
      {status === "off" && (
        <button type="button" onClick={enable} className="btn-ghost">
          Activar en este dispositivo
        </button>
      )}
      {status === "on" && (
        <button type="button" onClick={disable} className="btn-ghost">
          Desactivar en este dispositivo
        </button>
      )}
      <p role="status" aria-live="polite" className="text-sm text-muted">
        {message}
      </p>
    </div>
  );
}
