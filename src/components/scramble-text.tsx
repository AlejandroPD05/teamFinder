"use client";

import { useEffect, useRef, useState } from "react";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+/<>";

/**
 * Texto que se «descifra»: cuando `trigger` pasa a un valor verdadero (no al cargar), las letras pasan por caracteres al azar y se fijan
 * de izquierda a derecha en ~450 ms. El texto real está siempre disponible para lectores de pantalla.
 */
export function ScrambleText({ text, trigger }: { text: string; trigger: unknown }) {
  const [shown, setShown] = useState(text);
  const first = useRef(true);

  useEffect(() => {
    if (first.current || !trigger) {
      first.current = false;
      setShown(text);
      return;
    }
    const start = performance.now();
    const duration = 450;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const fixed = Math.floor(t * text.length);
      setShown(
        text
          .split("")
          .map((c, i) => (i < fixed || c === " " ? c : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
          .join(""),
      );
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [trigger, text]);

  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{shown}</span>
    </>
  );
}
