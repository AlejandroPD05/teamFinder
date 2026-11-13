import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { APP_NAME } from "@/lib/config";

// Imagen al compartir el enlace (Discord, WhatsApp, X…) y en algunos resultados de búsqueda. Sin marcas de terceros.
// El texto alternativo (en el idioma de la página) lo pone el layout en openGraph.images; quien pide la imagen suele ser
// un bot sin cookie, que la recibe en español.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const t = await getTranslations("meta");
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#0b0c12",
          color: "#e7e8ef",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 40, color: "#9ca0b4" }}>{APP_NAME}</div>
        <div style={{ marginTop: 24, fontSize: 76, fontWeight: 700, lineHeight: 1.1 }}>{t("ogTitle")}</div>
        <div style={{ marginTop: 32, fontSize: 36, color: "#9ca0b4" }}>VALORANT · Counter-Strike 2 · Apex Legends</div>
        <div style={{ marginTop: 48, width: 160, height: 10, background: "#ff6b6b" }} />
      </div>
    ),
    size,
  );
}
