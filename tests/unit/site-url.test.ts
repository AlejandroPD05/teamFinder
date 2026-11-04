import { describe, expect, it } from "vitest";
import { siteUrl } from "@/lib/supabase/env";

const env = (vars: Record<string, string>) => vars as unknown as NodeJS.ProcessEnv;

describe("siteUrl", () => {
  it("local por defecto", () => {
    expect(siteUrl(env({}))).toBe("http://127.0.0.1:3000");
  });
  it("NEXT_PUBLIC_SITE_URL manda y pierde la barra final", () => {
    expect(
      siteUrl(env({ NEXT_PUBLIC_SITE_URL: "https://mi-dominio.es/", VERCEL_ENV: "production", VERCEL_URL: "x.vercel.app" })),
    ).toBe("https://mi-dominio.es");
  });
  it("producción en Vercel usa el dominio de producción", () => {
    expect(
      siteUrl(
        env({
          VERCEL_ENV: "production",
          VERCEL_PROJECT_PRODUCTION_URL: "teamfinder.vercel.app",
          VERCEL_URL: "teamfinder-abc123.vercel.app",
        }),
      ),
    ).toBe("https://teamfinder.vercel.app");
  });
  it("preview usa la URL de su despliegue", () => {
    expect(
      siteUrl(
        env({
          VERCEL_ENV: "preview",
          VERCEL_PROJECT_PRODUCTION_URL: "teamfinder.vercel.app",
          VERCEL_URL: "teamfinder-git-rama.vercel.app",
        }),
      ),
    ).toBe("https://teamfinder-git-rama.vercel.app");
  });
});
