"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";

/**
 * Inclina su contenido hacia el puntero (máx. 8°) y mueve el reflejo holográfico (ver `.tilt` en globals.css).
 * Solo con ratón: en táctil no hay «hover» y la carta se queda quieta.
 */
export function TiltCard({ children, holo = false }: { children: ReactNode; holo?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  function move(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    const s = ref.current.style;
    s.setProperty("--ry", `${(x - 0.5) * 16}deg`);
    s.setProperty("--rx", `${(0.5 - y) * 16}deg`);
    s.setProperty("--mx", `${Math.round(x * 100)}%`);
    s.setProperty("--my", `${Math.round(y * 100)}%`);
    s.setProperty("--holo", "1");
  }

  function leave() {
    const s = ref.current?.style;
    if (!s) return;
    s.setProperty("--rx", "0deg");
    s.setProperty("--ry", "0deg");
    s.setProperty("--holo", "0");
  }

  return (
    <div ref={ref} className="tilt" data-holo={holo || undefined} onPointerMove={move} onPointerLeave={leave}>
      {children}
    </div>
  );
}
