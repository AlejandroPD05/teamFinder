import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { APP_NAME } from "@/lib/config";
import { loadGames } from "@/lib/games";
import { loadPlayerCard } from "@/lib/player-card-query";
import { BRAND } from "@/lib/brand";

// Vista previa de la tarjeta (Discord, redes). Solo datos que el jugador ya tiene públicos y ha decidido compartir.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function PlayerCardImage({ params }: { params: Promise<{ id: string; juego: string }> }) {
  const { id, juego } = await params;
  const [c, t] = await Promise.all([loadPlayerCard(id, juego), getTranslations("playerShare")]);
  const accent = c ? ((await loadGames()).find((g) => g.id === juego)?.theme_accent ?? BRAND.accent) : BRAND.accent;
  const rankColor = c?.rank_color && /^#[0-9a-fA-F]{6}$/.test(c.rank_color) ? c.rank_color : BRAND.text;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: BRAND.bg, color: BRAND.text, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", fontSize: 34, color: accent }}>{c ? c.game_name : APP_NAME}</div>
        <div style={{ display: "flex", marginTop: 16, fontSize: 84, fontWeight: 700 }}>{c ? c.display_name.slice(0, 24) : t("unavailable")}</div>
        {c && (
          <div style={{ display: "flex", marginTop: 24, fontSize: 44, gap: 24 }}>
            <span style={{ color: rankColor }}>{c.rank_name ?? t("unset")}</span>
            {(c.primary_role ?? c.roles[0]) && <span style={{ color: BRAND.muted }}>· {c.primary_role ?? c.roles[0]}</span>}
          </div>
        )}
        {c && c.mains.length > 0 && <div style={{ display: "flex", marginTop: 16, fontSize: 36, color: BRAND.muted }}>{t("mainsLine", { mains: c.mains.slice(0, 4).join(" · ") })}</div>}
        <div style={{ display: "flex", marginTop: 48, alignItems: "center", gap: 20 }}>
          <div style={{ width: 120, height: 10, background: accent }} />
          <div style={{ fontSize: 30, color: BRAND.muted }}>{APP_NAME}</div>
        </div>
      </div>
    ),
    size,
  );
}
