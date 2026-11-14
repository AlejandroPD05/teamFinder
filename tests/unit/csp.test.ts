import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, createNonce } from "@/lib/csp";

function directives(csp: string): Record<string, string[]> {
  return Object.fromEntries(
    csp.split(";").map((d) => {
      const [name, ...values] = d.trim().split(/\s+/);
      return [name, values];
    }),
  );
}

describe("Content-Security-Policy", () => {
  it("nonce distinto en cada petición", () => {
    const a = createNonce();
    expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(createNonce()).not.toBe(a);
  });

  it("scripts solo con nonce y strict-dynamic; sin eval ni inline en producción", () => {
    const d = directives(contentSecurityPolicy("abc", { supabaseUrl: "https://x.supabase.co" }));
    expect(d["script-src"]).toEqual(["'self'", "'nonce-abc'", "'strict-dynamic'"]);
    expect(d["object-src"]).toEqual(["'none'"]);
    expect(d["frame-ancestors"]).toEqual(["'none'"]);
    expect(d["base-uri"]).toEqual(["'self'"]);
  });

  it("en desarrollo permite eval (trazas de error de React)", () => {
    expect(directives(contentSecurityPolicy("abc", { dev: true }))["script-src"]).toContain("'unsafe-eval'");
  });

  it("Supabase: API y Realtime (wss en producción, ws en local)", () => {
    const prod = directives(contentSecurityPolicy("n", { supabaseUrl: "https://x.supabase.co" }));
    expect(prod["connect-src"]).toEqual(["'self'", "https://x.supabase.co", "wss://x.supabase.co"]);
    expect(prod["img-src"]).toContain("https://x.supabase.co");
    expect(prod["form-action"]).toEqual(["'self'", "https://x.supabase.co", "https://discord.com"]);
    const local = directives(contentSecurityPolicy("n", { supabaseUrl: "http://127.0.0.1:54321" }));
    expect(local["connect-src"]).toEqual(["'self'", "http://127.0.0.1:54321", "ws://127.0.0.1:54321"]);
  });

  it("sin URL de Supabase válida no rompe la cabecera", () => {
    const d = directives(contentSecurityPolicy("n", { supabaseUrl: "" }));
    expect(d["connect-src"]).toEqual(["'self'"]);
  });
});
