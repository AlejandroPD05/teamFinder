"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useOptimistic, useRef, useTransition, type MouseEvent } from "react";
import { gameFromPath } from "@/lib/config";
import { themeStyle, type GameTheme } from "@/lib/game-theme";
import { chooseGame, selectGame } from "./juego/actions";

type SwitcherGame = GameTheme & { id: string; name: string; short_name: string | null };

/**
 * Selector de juego: cambia el tema y el catálogo de toda la web.
 * Con JavaScript, el color cambia al instante (con transición) mientras el servidor prepara el nuevo catálogo;
 * sin JavaScript sigue funcionando como formulario.
 */
/** Tema inmediato: las variables de color están registradas con @property y se animan. */
function applyTheme(game: SwitcherGame) {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(themeStyle(game))) root.style.setProperty(k, String(v));
  root.setAttribute("data-game", game.id);
}

export function GameSwitcher({ games, current }: { games: SwitcherGame[]; current: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useOptimistic(current);
  const group = useRef<HTMLFieldSetElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());

  // Indicador que se desliza hasta el juego activo: el mismo objeto se mueve, no aparece uno nuevo.
  useLayoutEffect(() => {
    const b = buttons.current.get(active);
    if (!b || !pill.current || !group.current) return;
    pill.current.style.transform = `translateX(${b.offsetLeft}px)`;
    pill.current.style.width = `${b.offsetWidth}px`;
    group.current.setAttribute("data-ready", "");
  }, [active]);

  // Al entrar en /equipos/<otro juego> navegando dentro de la web, el proxy ya ha cambiado la cookie, pero el layout
  // (cabecera y colores) no se vuelve a pintar solo: se aplica el tema al momento y se refresca.
  const pathGame = gameFromPath(pathname);
  useEffect(() => {
    const game = games.find((g) => g.id === pathGame);
    if (!game || game.id === current) return;
    applyTheme(game);
    startTransition(() => {
      setActive(game.id);
      router.refresh();
    });
  }, [pathGame, current, games, router, setActive]);

  // Mientras llega la página del nuevo juego, el contenido se atenúa (ver globals.css).
  useEffect(() => {
    const root = document.documentElement;
    if (pending) root.setAttribute("data-switching", "");
    else root.removeAttribute("data-switching");
  }, [pending]);

  if (games.length < 2) return null;

  function choose(e: MouseEvent<HTMLButtonElement>, game: SwitcherGame) {
    e.preventDefault();
    if (game.id === active) return;
    applyTheme(game);
    const query = window.location.search;
    startTransition(async () => {
      setActive(game.id);
      const target = await chooseGame(game.id, pathname);
      // La acción ya ha vuelto a pintar la ruta actual con el juego nuevo; solo se navega si cambia la URL
      // (filtros de otro juego o detalle de un grupo).
      if (target !== pathname || query) router.replace(target);
    });
  }

  return (
    <form action={selectGame} className="flex items-center" aria-label="Juego">
      <input type="hidden" name="next" value={pathname} />
      <fieldset ref={group} className="group relative flex rounded-lg border border-line bg-bg-raised p-0.5">
        <legend className="sr-only">Juego</legend>
        <span
          ref={pill}
          aria-hidden="true"
          className="absolute inset-y-0.5 left-0 rounded-md bg-accent opacity-0 transition-[transform,width] duration-300 ease-[var(--ease-in-out)] group-data-[ready]:opacity-100"
        />
        {games.map((g) => {
          const on = g.id === active;
          return (
            <button
              key={g.id}
              ref={(el) => {
                if (el) buttons.current.set(g.id, el);
                else buttons.current.delete(g.id);
              }}
              type="submit"
              name="game"
              value={g.id}
              aria-pressed={on}
              onClick={(e) => choose(e, g)}
              className={`font-display relative min-h-9 whitespace-nowrap rounded-md px-2.5 text-xs font-semibold tracking-wide transition-colors duration-300 sm:text-sm ${
                on ? "bg-accent text-bg group-data-[ready]:bg-transparent" : "text-muted hover:text-text"
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
