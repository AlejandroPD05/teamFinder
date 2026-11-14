import { describe, expect, it } from "vitest";
import { isDisallowed, robotsDisallow } from "@/lib/robots-rules";

describe("robots.txt", () => {
  const rules = robotsDisallow();
  it("deja rastrear las páginas públicas aunque empiecen como una privada", () => {
    for (const path of ["/", "/equipos/valorant", "/equipos/cs2/awper", "/demo", "/normas", "/privacidad", "/novedades", "/unete/x", "/invitar/abcd1234", "/tarjeta/x/valorant"]) {
      expect(isDisallowed(path, rules), path).toBe(false);
    }
  });
  it("bloquea las privadas, con subrutas y con parámetros", () => {
    for (const path of ["/equipo", "/equipo/123", "/inicio", "/perfil/editar", "/sugerencias?desde=/inicio", "/jugador/1", "/entrar", "/entrar?next=/inicio", "/auth/callback"]) {
      expect(isDisallowed(path, rules), path).toBe(true);
    }
  });
  it("el comprobador sigue la semántica de Google", () => {
    expect(isDisallowed("/equipos/x", ["/equipo"])).toBe(true);
    expect(isDisallowed("/a.b", ["/a.b$"])).toBe(true);
    expect(isDisallowed("/a.bc", ["/a.b$"])).toBe(false);
  });
});
