"use client";

import { useState } from "react";
import { NumberRoll } from "@/components/number-roll";

/**
 * Botón de emblema: al pulsarlo se aplasta y recupera la forma (squash & stretch, `.pop`). Dar un emblema pasa pocas
 * veces por clip, así que merece ese feedback; el envío sigue siendo el formulario del servidor.
 */
export function EmblemButton({
  name,
  description,
  count,
  mine,
  disabled,
}: {
  name: string;
  description: string | null;
  count: number;
  mine: boolean;
  disabled: boolean;
}) {
  const [popping, setPopping] = useState(false);
  return (
    <button
      type="submit"
      disabled={disabled}
      aria-pressed={mine}
      title={description ?? undefined}
      onClick={() => setPopping(true)}
      onAnimationEnd={() => setPopping(false)}
      className={`inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm transition-[background-color,border-color] duration-150 ease-out disabled:cursor-not-allowed ${
        popping ? "pop" : ""
      } ${mine ? "border-accent bg-panel-hover font-medium" : "border-line hover:bg-panel-hover"}`}
    >
      {name}
      <NumberRoll value={count} className="text-muted" />
    </button>
  );
}
