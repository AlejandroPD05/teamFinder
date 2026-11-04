import { describe, expect, it } from "vitest";
import { emailSchema, isProtectedPath, safeNextPath } from "@/lib/auth";

describe("safeNextPath", () => {
  it.each([
    ["/inicio", "/inicio"],
    ["/inicio?tab=perfil", "/inicio?tab=perfil"],
  ])("acepta ruta interna %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it.each([
    [null],
    [undefined],
    [""],
    ["https://evil.com"],
    ["//evil.com"],
    ["/\\evil.com"],
    ["inicio"],
    ["javascript:alert(1)"],
  ])("rechaza %s y vuelve a /inicio", (input) => {
    expect(safeNextPath(input)).toBe("/inicio");
  });
});

describe("isProtectedPath", () => {
  it("protege /inicio y subrutas", () => {
    expect(isProtectedPath("/inicio")).toBe(true);
    expect(isProtectedPath("/inicio/ajustes")).toBe(true);
  });
  it("no confunde prefijos parecidos ni rutas públicas", () => {
    expect(isProtectedPath("/iniciosesion")).toBe(false);
    expect(isProtectedPath("/")).toBe(false);
    expect(isProtectedPath("/entrar")).toBe(false);
  });
});

describe("emailSchema", () => {
  it("normaliza", () => {
    expect(emailSchema.parse("  Jugador@Example.COM ")).toBe("jugador@example.com");
  });
  it.each(["", "no-es-correo", "a@", `${"a".repeat(250)}@x.com`])("rechaza %s", (v) => {
    expect(emailSchema.safeParse(v).success).toBe(false);
  });
});
