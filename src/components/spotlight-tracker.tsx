"use client";

import { useEffect } from "react";

/**
 * Foco que sigue al ratón en las tarjetas con `.spotlight` (ver globals.css). Un único escuchador para toda la web:
 * coloca la posición del puntero en la tarjeta que está debajo. Solo con ratón.
 */
export function SpotlightTracker() {
  useEffect(() => {
    function move(e: PointerEvent) {
      if (e.pointerType !== "mouse") return;
      const card = (e.target as Element | null)?.closest?.<HTMLElement>(".spotlight");
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--sx", `${e.clientX - r.left}px`);
      card.style.setProperty("--sy", `${e.clientY - r.top}px`);
    }
    document.addEventListener("pointermove", move, { passive: true });
    return () => document.removeEventListener("pointermove", move);
  }, []);
  return null;
}
