import { loadGames } from "@/lib/games";
import { logoSvg } from "@/lib/brand";

// Favicon: el logo de la web con el color del juego (ver `icons` en src/app/layout.tsx).
export async function GET(_req: Request, { params }: RouteContext<"/icono/[juego]">) {
  const { juego } = await params;
  const game = (await loadGames()).find((g) => g.id === juego);
  return new Response(logoSvg(game?.theme_accent ?? ""), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
