import type { MetadataRoute } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { APP_NAME } from "@/lib/config";

// La web se puede instalar como app (pantalla de inicio del móvil o escritorio). Necesario también para recibir
// notificaciones push en iPhone, donde solo funcionan con la web instalada.
// El navegador lo pide sin cookies: el idioma sale de Accept-Language.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("meta")]);
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: t("manifestDescription"),
    start_url: "/inicio",
    scope: "/",
    display: "standalone",
    background_color: "#0b0c12",
    theme_color: "#0b0c12",
    lang: locale,
    icons: [
      { src: "/icono/app/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icono/app/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icono/app/512?maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
