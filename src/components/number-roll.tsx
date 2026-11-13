"use client";

import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { INTL_LOCALE } from "@/lib/i18n/locale";

/**
 * Número cuyos dígitos ruedan como un marcador al cambiar (y al aparecer, desde 0). Cada dígito es una tira 0–9 que
 * se desplaza (dibujada con CSS, así no ensucia el texto de la página); el número real va en texto accesible.
 */
export function NumberRoll({ value, max, className = "" }: { value: number; max?: number; className?: string }) {
  const capped = max != null && value > max;
  const target = capped ? max! : Math.max(0, Math.round(value));
  // Primer pintado en 0 (igual en servidor y cliente) y, ya montado, al valor: así rueda también al aparecer.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(target));
    return () => cancelAnimationFrame(id);
  }, [target]);

  const locale = useLocale();
  const text = target.toLocaleString(INTL_LOCALE[locale]);
  const separator = locale === "es" ? "." : ",";
  const digits = String(shown).padStart(String(target).length, "0").split("");
  // Separadores de miles en la misma posición que en el texto final.
  const out: (string | number)[] = [];
  const len = digits.length;
  digits.forEach((d, i) => {
    out.push(Number(d));
    const left = len - 1 - i;
    if (left > 0 && left % 3 === 0) out.push(separator);
  });

  return (
    <span className={`inline-flex tabular-nums ${className}`}>
      <span className="sr-only">
        {text}
        {capped ? "+" : ""}
      </span>
      <span aria-hidden="true" className="inline-flex">
        {out.map((d, i) =>
          typeof d === "string" ? (
            <span key={`s${i}`}>{d}</span>
          ) : (
            <span key={`d${out.length - i}`} className="roll-digit">
              <span className="roll-strip" style={{ transform: `translateY(-${d * 10}%)` }} />
            </span>
          ),
        )}
        {capped && <span>+</span>}
      </span>
    </span>
  );
}
