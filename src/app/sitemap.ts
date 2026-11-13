import type { MetadataRoute } from "next";
import { CHANGELOG, newestFirst } from "@/lib/changelog";
import { rolePagePath } from "@/lib/role-pages";
import { publicGameIds, publicGameRoles } from "@/lib/seo";
import { siteUrl } from "@/lib/supabase/env";

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [games, roles] = await Promise.all([publicGameIds(), publicGameRoles()]);
  const latest = newestFirst(CHANGELOG)[0]?.date;
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    ...games.map((id) => ({ url: `${base}/equipos/${id}`, changeFrequency: "weekly" as const, priority: 0.9 })),
    ...roles.map((r) => ({ url: `${base}${rolePagePath(r.game, r.role)}`, changeFrequency: "weekly" as const, priority: 0.8 })),
    { url: `${base}/demo`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/novedades`, changeFrequency: "weekly", priority: 0.5, ...(latest && { lastModified: latest }) },
    { url: `${base}/normas`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/privacidad`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
