import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { APP_NAME } from "@/lib/config";
import { loadGames } from "@/lib/games";
import { loadSharedLobby } from "@/lib/shared-lobby-query";

// Tarjeta de vista previa del grupo compartido (Discord la muestra al pegar el enlace). El texto alternativo lo pone
// la página (openGraph.images) en su idioma.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function SharedLobbyImage({ params }: { params: Promise<{ id: string }> }) {
  const l = await loadSharedLobby((await params).id);
  const accent = l ? ((await loadGames()).find((g) => g.id === l.game_id)?.theme_accent ?? "#8b5cf6") : "#8b5cf6";
  const t = await getTranslations("shared");
  const free = l ? Math.max(0, l.slots - l.taken) : 0;
  const status = !l ? t("unavailable") : l.status === "open" ? t("freeOf", { count: free, slots: l.slots }) : l.status === "full" ? t("groupFull") : t("groupClosed");
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "#0b0c12", color: "#e7e8ef", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", fontSize: 34, color: accent }}>{l ? l.game_name : APP_NAME}</div>
        <div style={{ display: "flex", marginTop: 16, fontSize: 84, fontWeight: 700 }}>{l ? l.mode_name : APP_NAME}</div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 44 }}>{status}</div>
        {l && l.roles.length > 0 && <div style={{ display: "flex", marginTop: 16, fontSize: 38, color: "#9ca0b4" }}>{t("lookingFor", { roles: l.roles.join(" · ") })}</div>}
        {l && (l.rank_min || l.rank_max) && (
          <div style={{ display: "flex", marginTop: 12, fontSize: 34, color: "#9ca0b4" }}>
            {t("rankRange", { min: l.rank_min ?? "—", max: l.rank_max ?? "—" })}
          </div>
        )}
        <div style={{ display: "flex", marginTop: 48, alignItems: "center", gap: 20 }}>
          <div style={{ width: 120, height: 10, background: accent }} />
          <div style={{ fontSize: 30, color: "#9ca0b4" }}>{APP_NAME}</div>
        </div>
      </div>
    ),
    size,
  );
}
