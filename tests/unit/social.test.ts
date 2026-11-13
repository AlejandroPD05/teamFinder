import { describe, expect, it } from "vitest";
import { dmError } from "@/lib/dm";
import { fanartError, fanartSchema, isFanartUrl } from "@/lib/fanart";
import { notificationText } from "@/lib/notifications";

const U = "11111111-1111-4111-8111-111111111111";

describe("fanartSchema", () => {
  const base = { game: "valorant", title: "Jett", artist: "Ana", portfolio: "", path: `${U}/abc.png`, license: "on" };

  it("acepta un envío completo y deja el portfolio opcional", () => {
    const r = fanartSchema.safeParse(base);
    expect(r.success).toBe(true);
    expect(r.data?.portfolio).toBeNull();
  });

  it("exige aceptar el permiso, una ruta propia válida y enlaces https", () => {
    expect(fanartSchema.safeParse({ ...base, license: null }).success).toBe(false);
    expect(fanartSchema.safeParse({ ...base, path: "../otra/abc.png" }).success).toBe(false);
    expect(fanartSchema.safeParse({ ...base, path: `${U}/abc.gif` }).success).toBe(false);
    expect(fanartSchema.safeParse({ ...base, portfolio: "http://inseguro.example" }).success).toBe(false);
    expect(fanartSchema.safeParse({ ...base, title: "<b>x</b>" }).success).toBe(false);
  });

  it("reconoce las URL del bucket de fanart", () => {
    expect(isFanartUrl(`https://x.supabase.co/storage/v1/object/public/fanart/${U}/a.png`)).toBe(true);
    expect(isFanartUrl("/cards/cs2/a.svg")).toBe(false);
    expect(fanartError("restricted")).toContain("restringida");
  });
});

describe("notificaciones y privados", () => {
  it("cada notificación tiene texto y enlace", () => {
    const base = { lobby_id: U, clip_id: U, body: "hola" };
    expect(notificationText({ ...base, kind: "join_request" }, "Ana")).toEqual({ title: "Ana quiere unirse a tu grupo", detail: "hola", href: `/grupos/${U}` });
    expect(notificationText({ ...base, kind: "clip_comment" }, null).href).toBe(`/clips/${U}`);
    // El karma no dice quién lo dio.
    expect(notificationText({ ...base, kind: "karma" }, null).title).not.toContain("Alguien");
    expect(notificationText({ ...base, kind: "restriction" }, null).href).toBe("/normas");
  });

  it("traduce los errores de los privados", () => {
    expect(dmError("closed")).toBe("Esta persona no admite mensajes privados.");
    expect(dmError("desconocido")).toBe("No se pudo completar. Inténtalo de nuevo.");
  });
});

describe("ranking semanal", () => {
  it("insignia según el puesto y semanas legibles", async () => {
    const { rankTier, weekLabel, currentWeekStart, daysLeft } = await import("@/lib/ranking");
    expect([1, 2, 3, 4, 10].map(rankTier)).toEqual(["top1", "podium", "podium", "top10", "top10"]);
    expect(weekLabel("2026-11-09")).toBe("del 9 nov al 15 nov");
    // Jueves 12/11/2026 a las 23:30 en Madrid → semana del lunes 9; quedan 4 días (jue, vie, sáb, dom).
    const thu = new Date("2026-11-12T22:30:00Z");
    expect(currentWeekStart(thu)).toBe("2026-11-09");
    expect(daysLeft(thu)).toBe(4);
    // Domingo 23:30 en Madrid sigue siendo la misma semana; el lunes 00:30 ya es la siguiente.
    expect(currentWeekStart(new Date("2026-11-15T22:30:00Z"))).toBe("2026-11-09");
    expect(currentWeekStart(new Date("2026-11-15T23:30:00Z"))).toBe("2026-11-16");
  });
});
