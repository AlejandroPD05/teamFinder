"use client";

import { useTranslations } from "next-intl";
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
  const t = useTranslations("push");

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
        setMessage(t("error"));
        return;
      }
      setStatus("on");
      setMessage(t("enabled"));
    } catch {
      setMessage(t("blockedByBrowser"));
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
    setMessage(t("disabled"));
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-sm">
        {status === "checking" && t("checking")}
        {status === "unsupported" && t("unsupported")}
        {status === "unconfigured" && t("unconfigured")}
        {status === "denied" && t("denied")}
        {status === "off" && t.rich("nowOff", { b: (c) => <strong>{c}</strong> })}
        {status === "on" && t.rich("nowOn", { b: (c) => <strong>{c}</strong> })}
      </p>
      {status === "off" && (
        <button type="button" onClick={enable} className="btn-ghost">
          {t("enable")}
        </button>
      )}
      {status === "on" && (
        <button type="button" onClick={disable} className="btn-ghost">
          {t("disable")}
        </button>
      )}
      <p role="status" aria-live="polite" className="text-sm text-muted">
        {message}
      </p>
    </div>
  );
}
