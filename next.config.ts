import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// La Content-Security-Policy (con nonce por petición) la pone src/proxy.ts; aquí, el resto de cabeceras de seguridad.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // El CSS (Tailwind, ~12 KB comprimido) va dentro del HTML: sin la petición que bloqueaba el primer pintado, el
  // título o el texto principal (el LCP) se pintan una ida y vuelta antes en móvil. Solo afecta al build de producción.
  experimental: { inlineCss: true },
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
  // El favicon es una ruta (src/app/icono/[juego]): quien pida /favicon.ico directamente recibe el del juego por defecto.
  async redirects() {
    return [{ source: "/favicon.ico", destination: "/icono/valorant", permanent: false }];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

// next-intl sin rutas por idioma: la configuración por petición está en src/i18n/request.ts.
export default createNextIntlPlugin("./src/i18n/request.ts")(nextConfig);
