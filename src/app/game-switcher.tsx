"use client";

import { Gamepad2, Users } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useOptimistic, useTransition, type CSSProperties, type MouseEvent } from "react";
import { GAME_GLYPHS } from "@/components/game-glyphs";
import { NumberRoll } from "@/components/number-roll";
import { ScrambleText } from "@/components/scramble-text";
import { gameFromPath } from "@/lib/config";
import { themeStyle, type GameTheme } from "@/lib/game-theme";
import { chooseGame, selectGame } from "./juego/actions";

// Icono propio de cada juego (no su logotipo: Riot prohíbe usar sus logos, EA los limita y Valve no da permiso).
type PickerGame = GameTheme & { id: string; name: string; short_name: string | null };

/** Tema inmediato: las variables de color están registradas con @property y se animan. */
function applyTheme(game: PickerGame) {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(themeStyle(game))) root.style.setProperty(k, String(v));
  root.setAttribute("data-game", game.id);
}

/** Mientras llega la página del nuevo juego, el contenido se atenúa (ver globals.css). */
function useDimWhile(pending: boolean) {
  useEffect(() => {
    const root = document.documentElement;
    if (pending) root.setAttribute("data-switching", "");
    else root.removeAttribute("data-switching");
  }, [pending]);
}

/**
 * Sin interfaz, en el layout: visitar de verdad /equipos/<juego> (no una precarga del enlace) elige ese juego para el
 * resto de la web. Navegando dentro de la web el layout no se vuelve a pintar solo: se aplica el tema al momento y la
 * acción lo refresca.
 */
export function GameSync({ games, current, saved }: { games: PickerGame[]; current: string; saved: string | null }) {
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  useDimWhile(pending);
  const pathGame = gameFromPath(pathname);
  useEffect(() => {
    const game = games.find((g) => g.id === pathGame);
    if (!game || game.id === saved) return;
    if (game.id !== current) applyTheme(game);
    startTransition(async () => {
      await chooseGame(game.id, pathname);
    });
  }, [pathGame, saved, current, games, pathname]);
  return null;
}

/**
 * Selector de juego de la portada: un recuadro por juego con su nombre y cuántos jugadores tienen perfil.
 * Con JavaScript el color cambia al instante (con transición) mientras llega el catálogo; sin JavaScript es un formulario.
 * Sin logotipos de los juegos: sus políticas no permiten usarlos.
 */
export function GamePicker({
  games,
  current,
  counts,
  nowCounts,
}: {
  games: PickerGame[];
  current: string;
  counts: Record<string, number>;
  /** Cuántos se han marcado «disponible ahora» en cada juego. */
  nowCounts?: Record<string, number>;
}) {
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useOptimistic(current);
  useDimWhile(pending);

  if (games.length < 2) return null;

  function choose(e: MouseEvent<HTMLButtonElement>, game: PickerGame) {
    e.preventDefault();
    if (game.id === active) return;
    applyTheme(game);
    startTransition(async () => {
      setActive(game.id);
      await chooseGame(game.id, pathname);
    });
  }

  return (
    <form action={selectGame} aria-label="Juego" className="w-full max-w-2xl">
      <input type="hidden" name="next" value={pathname} />
      <fieldset className="grid grid-cols-3 gap-3 sm:gap-4">
        <legend className="mb-3 w-full text-center text-sm text-muted">Elige juego</legend>
        {games.map((g) => {
          const on = g.id === active;
          const n = counts[g.id] ?? 0;
          const live = nowCounts?.[g.id] ?? 0;
          return (
            <button
              key={g.id}
              type="submit"
              name="game"
              value={g.id}
              aria-pressed={on}
              onClick={(e) => choose(e, g)}
              style={
                {
                  "--tile": g.theme_accent ?? "var(--color-accent)",
                  "--tile-text": g.theme_accent_soft ?? g.theme_accent ?? "var(--color-text)",
                } as CSSProperties
              }
              className={`flex aspect-square min-h-28 flex-col items-center justify-center gap-1.5 rounded-xl border-2 bg-[linear-gradient(180deg,rgb(255_255_255/0.05),transparent_50%)] p-3 transition-[border-color,background-color,transform,box-shadow] duration-200 ease-out active:scale-[0.97] sm:gap-3 ${
                on
                  ? "border-[var(--tile)] bg-[color-mix(in_srgb,var(--tile)_14%,var(--color-panel))] shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_18px_44px_-16px_var(--tile)]"
                  : "border-line bg-panel shadow-[inset_0_1px_0_rgb(255_255_255/0.05),0_10px_24px_-18px_black] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--tile)_60%,var(--color-line))]"
              }`}
            >
              {(() => {
                const Glyph = GAME_GLYPHS[g.id] ?? Gamepad2;
                return <Glyph aria-hidden="true" className="size-11 text-[var(--tile-text)] drop-shadow-[0_4px_12px_color-mix(in_srgb,var(--tile)_45%,transparent)] sm:size-16" />;
              })()}
              <span className="font-display text-center text-sm font-bold leading-tight tracking-wide sm:text-xl">
                <ScrambleText text={g.short_name ?? g.name} trigger={on && active} />
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted sm:text-sm">
                <Users aria-hidden="true" className="hidden size-4 sm:block" />
                <span>
                  <NumberRoll value={n} /> {n === 1 ? "jugador" : "jugadores"}
                </span>
              </span>
              {live > 0 && (
                <span className="flex items-center gap-1.5 text-xs text-success">
                  <span aria-hidden="true" className="live-dot" />
                  <span>
                    <NumberRoll value={live} /> ahora
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </fieldset>
    </form>
  );
}
