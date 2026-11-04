import { afterEach, describe, expect, it } from "vitest";
import { discordInvite } from "@/lib/config";

describe("discordInvite", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_DISCORD_INVITE_URL;
  });
  it("acepta solo invitaciones https de Discord", () => {
    for (const ok of ["https://discord.gg/abc123", "https://discord.com/invite/Abc-1"]) {
      process.env.NEXT_PUBLIC_DISCORD_INVITE_URL = ok;
      expect(discordInvite()).toBe(ok);
    }
    for (const bad of ["", "http://discord.gg/abc", "https://evil.com/discord.gg/x", "https://discord.gg/abc?x=1", "javascript:alert(1)"]) {
      process.env.NEXT_PUBLIC_DISCORD_INVITE_URL = bad;
      expect(discordInvite()).toBeNull();
    }
  });
});

describe("emailLoginEnabled", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_EMAIL_LOGIN;
  });
  it("activo por defecto y apagado solo con off", async () => {
    const { emailLoginEnabled } = await import("@/lib/config");
    expect(emailLoginEnabled()).toBe(true);
    process.env.NEXT_PUBLIC_EMAIL_LOGIN = "off";
    expect(emailLoginEnabled()).toBe(false);
  });
});
