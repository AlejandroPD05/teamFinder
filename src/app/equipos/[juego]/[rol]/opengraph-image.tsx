import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { APP_NAME } from "@/lib/config";
import { loadGames } from "@/lib/games";
import { loadCatalog } from "@/lib/profile/queries";
import { createClient } from "@/lib/supabase/server";

// Vista previa al compartir «Busco <rol> en <juego>» (Discord, WhatsApp, X…): texto propio y el color de TeamFinder
// para ese juego, sin logotipos ni arte de terceros. El texto alternativo lo pone la página en su idioma.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function RoleImage({ params }: { params: Promise<{ juego: string; rol: string }> }) {
  const { juego, rol } = await params;
  const game = (await loadGames()).find((g) => g.id === juego);
  const role = game ? (await loadCatalog(await createClient(), game.id)).roles.find((r) => r.slug === rol) : undefined;
  const t = await getTranslations("rolePage");
  const accent = game?.theme_accent ?? "#8b5cf6";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "#0b0c12", color: "#e7e8ef", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", fontSize: 36, color: accent }}>{game?.name ?? APP_NAME}</div>
        <div style={{ display: "flex", marginTop: 20, fontSize: 88, fontWeight: 700, lineHeight: 1.05 }}>
          {game && role ? t("title", { role: role.name, game: game.name }) : APP_NAME}
        </div>
        {game && role && <div style={{ display: "flex", marginTop: 28, fontSize: 38, color: "#9ca0b4" }}>{t("ogLead")}</div>}
        <div style={{ display: "flex", marginTop: 56, alignItems: "center", gap: 20 }}>
          <div style={{ width: 120, height: 10, background: accent }} />
          <div style={{ fontSize: 30, color: "#9ca0b4" }}>{APP_NAME}</div>
        </div>
      </div>
    ),
    size,
  );
}
