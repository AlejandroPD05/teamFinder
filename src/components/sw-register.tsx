"use client";

import { useEffect } from "react";

/** Registra el service worker (para instalar la web como app y recibir push). Solo en producción. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
