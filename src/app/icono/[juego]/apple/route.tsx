import { ImageResponse } from "next/og";
import { LOGO_BOTTOM, LOGO_MUTED, LOGO_TOP, safeHex } from "@/lib/brand";
import { loadGames } from "@/lib/games";

// Icono para la pantalla de inicio de iOS (PNG 180×180): el logo sobre el fondo de la web.
export async function GET(_req: Request, { params }: RouteContext<"/icono/[juego]/apple">) {
  const { juego } = await params;
  const game = (await loadGames()).find((g) => g.id === juego);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b0c12" }}>
        <svg width="120" height="120" viewBox="2 4 28 28">
          <path d={LOGO_TOP} fill={safeHex(game?.theme_accent)} />
          <path d={LOGO_BOTTOM} fill={LOGO_MUTED} />
        </svg>
      </div>
    ),
    { width: 180, height: 180, headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" } },
  );
}
