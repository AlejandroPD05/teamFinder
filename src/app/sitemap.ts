import type { MetadataRoute } from "next";
import { publicGameIds } from "@/lib/seo";
import { siteUrl } from "@/lib/supabase/env";

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const games = await publicGameIds();
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    ...games.map((id) => ({ url: `${base}/equipos/${id}`, changeFrequency: "weekly" as const, priority: 0.9 })),
    { url: `${base}/demo`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/normas`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/privacidad`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
