import { ImageResponse } from "next/og";
import { BRAND_ACCENT, LOGO_BOTTOM, LOGO_MUTED, LOGO_TOP } from "@/lib/brand";

// Iconos de la app instalada (192 y 512 px). «maskable»: con margen de seguridad para recortes redondos.
export async function GET(req: Request, { params }: RouteContext<"/icono/app/[size]">) {
  const size = (await params).size === "192" ? 192 : 512;
  const maskable = new URL(req.url).searchParams.has("maskable");
  const logo = Math.round(size * (maskable ? 0.55 : 0.7));
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b0c12" }}>
        <svg width={logo} height={logo} viewBox="2 4 28 28">
          <path d={LOGO_TOP} fill={BRAND_ACCENT} />
          <path d={LOGO_BOTTOM} fill={LOGO_MUTED} />
        </svg>
      </div>
    ),
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=604800" } },
  );
}
