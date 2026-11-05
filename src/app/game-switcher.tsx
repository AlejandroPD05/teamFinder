"use client";

import { usePathname } from "next/navigation";
import { selectGame } from "./juego/actions";

/** Selector de juego: cambia el tema y el catálogo de toda la web. Funciona sin JavaScript (formulario). */
export function GameSwitcher({ games, current }: { games: { id: string; name: string; short_name: string | null }[]; current: string }) {
  const pathname = usePathname();
  if (games.length < 2) return null;
  return (
    <form action={selectGame} className="flex items-center" aria-label="Juego">
      <input type="hidden" name="next" value={pathname} />
      <fieldset className="flex rounded-lg border border-line bg-bg-raised/70 p-0.5">
        <legend className="sr-only">Juego</legend>
        {games.map((g) => {
          const active = g.id === current;
          return (
            <button
              key={g.id}
              type="submit"
              name="game"
              value={g.id}
              aria-pressed={active}
              className={`font-display min-h-9 whitespace-nowrap rounded-md px-2.5 text-xs font-semibold tracking-wide sm:text-sm ${
                active ? "bg-accent text-bg" : "text-muted hover:text-text"
              }`}
            >
              {g.short_name ?? g.name}
            </button>
          );
        })}
      </fieldset>
    </form>
  );
}
