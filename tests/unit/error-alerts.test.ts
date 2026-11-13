import { describe, expect, it } from "vitest";
import {
  alertKey,
  alertsEnabled,
  buildAlertContent,
  buildWebhookBody,
  createRateLimiter,
  describeError,
  isDiscordWebhookUrl,
  MAX_ERROR_MESSAGE,
  sanitizeErrorMessage,
} from "@/lib/error-alerts";

const WEBHOOK = "https://discord.com/api/webhooks/123456789012345678/abcDEF_ghi-jkl0123456789xyz";
const env = (vars: Record<string, string>) => vars as unknown as NodeJS.ProcessEnv;

describe("isDiscordWebhookUrl", () => {
  it("acepta webhooks de discord.com y discordapp.com", () => {
    expect(isDiscordWebhookUrl(WEBHOOK)).toBe(true);
    expect(isDiscordWebhookUrl(WEBHOOK.replace("discord.com", "discordapp.com"))).toBe(true);
  });
  it("rechaza vacíos, http, otros dominios, rutas o extras", () => {
    for (const bad of [
      undefined,
      "",
      "no es una url",
      WEBHOOK.replace("https:", "http:"),
      WEBHOOK.replace("discord.com", "discord.com.evil.example"),
      WEBHOOK.replace("discord.com", "evil.example"),
      WEBHOOK.replace("discord.com", "discord.com:8443"),
      WEBHOOK.replace("https://", "https://user:pass@"),
      `${WEBHOOK}?wait=true`,
      `${WEBHOOK}#x`,
      "https://discord.com/api/webhooks/123456789012345678",
      "https://discord.com/api/otra/123456789012345678/abcDEF_ghi-jkl0123456789xyz",
    ]) {
      expect(isDiscordWebhookUrl(bad), String(bad)).toBe(false);
    }
  });
});

describe("alertsEnabled", () => {
  it("solo en producción y con un webhook válido", () => {
    expect(alertsEnabled(env({ NODE_ENV: "production", ERROR_WEBHOOK_URL: WEBHOOK }))).toBe(true);
    expect(alertsEnabled(env({ NODE_ENV: "production", VERCEL_ENV: "production", ERROR_WEBHOOK_URL: WEBHOOK }))).toBe(true);
    expect(alertsEnabled(env({ NODE_ENV: "development", ERROR_WEBHOOK_URL: WEBHOOK }))).toBe(false);
    expect(alertsEnabled(env({ NODE_ENV: "production", VERCEL_ENV: "preview", ERROR_WEBHOOK_URL: WEBHOOK }))).toBe(false);
    expect(alertsEnabled(env({ NODE_ENV: "production", ERROR_WEBHOOK_URL: "https://example.com/hook" }))).toBe(false);
    expect(alertsEnabled(env({ NODE_ENV: "production" }))).toBe(false);
  });
});

describe("describeError y sanitizeErrorMessage", () => {
  it("lee mensaje y digest de cualquier valor", () => {
    expect(describeError(Object.assign(new Error("fallo"), { digest: "12345" }))).toEqual({ message: "fallo", digest: "12345" });
    expect(describeError("texto")).toEqual({ message: "texto", digest: undefined });
    expect(describeError(null).message).toBe("Error desconocido");
  });
  it("oculta correos, UUID y URLs, y recorta", () => {
    const out = sanitizeErrorMessage(
      "user ana.p+x@correo.es id 3f2b1c4d-1111-4abc-8def-0123456789ab en https://x.supabase.co/rest?token=secreto",
    );
    expect(out).not.toMatch(/ana|3f2b1c4d|secreto|supabase\.co/);
    expect(out).toContain("[correo]");
    expect(out).toContain("[id]");
    expect(out).toContain("[url]");
    const long = sanitizeErrorMessage("a".repeat(1000));
    expect(long.length).toBe(MAX_ERROR_MESSAGE);
    expect(long.endsWith("…")).toBe(true);
  });
});

describe("buildAlertContent", () => {
  const alert = {
    routePath: "/equipos/[juego]",
    method: "get",
    routeType: "render",
    renderSource: "react-server-components",
    message: "relation does not exist\n```@everyone``` de 3f2b1c4d-1111-4abc-8def-0123456789ab",
    digest: "987654",
  };
  it("incluye ruta, método, origen, digest y mensaje", () => {
    const text = buildAlertContent(alert);
    expect(text).toContain("GET /equipos/[juego]");
    expect(text).toContain("render · react-server-components");
    expect(text).toContain("987654");
    expect(text).toContain("relation does not exist");
    expect(text.length).toBeLessThan(2000);
  });
  it("no deja escapar el bloque de código ni ids", () => {
    const text = buildAlertContent(alert);
    expect(text.match(/```/g)).toHaveLength(2);
    expect(text).not.toContain("3f2b1c4d");
  });
  it("el cuerpo solo lleva el texto y desactiva menciones", () => {
    const body = JSON.parse(buildWebhookBody(alert));
    expect(Object.keys(body).sort()).toEqual(["allowed_mentions", "content"]);
    expect(body.allowed_mentions).toEqual({ parse: [] });
  });
});

describe("createRateLimiter", () => {
  it("un aviso por clave y ventana", () => {
    const allow = createRateLimiter({ windowMs: 1000, maxPerWindow: 10 });
    expect(allow("a", 0)).toBe(true);
    expect(allow("a", 500)).toBe(false);
    expect(allow("b", 500)).toBe(true);
    expect(allow("a", 1000)).toBe(true);
  });
  it("tope total por ventana aunque los mensajes cambien", () => {
    const allow = createRateLimiter({ windowMs: 1000, maxPerWindow: 3 });
    expect([1, 2, 3, 4, 5].map((i) => allow(`m${i}`, i))).toEqual([true, true, true, false, false]);
    expect(allow("m6", 1002)).toBe(true);
  });
  it("misma ruta y mensaje comparten clave", () => {
    expect(alertKey({ routePath: "/a", message: "x  y" })).toBe(alertKey({ routePath: "/a", message: "x y" }));
    expect(alertKey({ routePath: "/a", message: "x" })).not.toBe(alertKey({ routePath: "/b", message: "x" }));
  });
});
