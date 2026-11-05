import type { MetadataRoute } from "next";
import { PROTECTED_PREFIXES } from "@/lib/config";
import { indexable } from "@/lib/seo";
import { siteUrl } from "@/lib/supabase/env";

// Se indexan la portada, las páginas por juego, la demo y los textos legales. Lo que exige sesión y los perfiles
// de jugadores (datos personales) quedan fuera.
export default function robots(): MetadataRoute.Robots {
  if (!indexable()) return { rules: { userAgent: "*", disallow: "/" } };
  const base = siteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...PROTECTED_PREFIXES, "/jugador/", "/auth/", "/entrar"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
