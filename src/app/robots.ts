import type { MetadataRoute } from "next";
import { robotsDisallow } from "@/lib/robots-rules";
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
      disallow: robotsDisallow(),
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
