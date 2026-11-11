import type { NextConfig } from "next";

// CSP prudente: bloquea plugins, <base> ajenos, incrustar la web en iframes y enviar formularios a otros dominios
// (salvo el login de Supabase/Discord). No restringe scripts para no romper la hidratación de Next sin nonces.
const supabaseOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return "";
  }
})();
const csp = [
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  `form-action 'self' ${supabaseOrigin} https://discord.com`.trim(),
  // Reproductores de clips: solo estos proveedores pueden ir en un iframe (ver src/lib/clips/links.ts).
  "frame-src https://www.youtube-nocookie.com https://clips.twitch.tv https://streamable.com",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.discordapp.com" },
      { protocol: "https", hostname: "media.valorant-api.com" },
      // Leyendas de Apex Legends desde la web oficial de EA (ver migración 20261105040000_apex_icons.sql).
      { protocol: "https", hostname: "drop-assets.ea.com", pathname: "/images/**" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
