import { describe, expect, it } from "vitest";
import { formatBytes, usage } from "@/lib/admin-stats";
import { buildCalendar, calendarResponse, icsDate, icsFold, icsText } from "@/lib/ics";

describe("calendario (.ics)", () => {
  it("fechas en UTC y texto escapado", () => {
    expect(icsDate(new Date("2026-11-14T18:30:05.123Z"))).toBe("20261114T183005Z");
    expect(icsText("Duo, ranked; a\\b\nfin")).toBe("Duo\\, ranked\\; a\\\\b\\nfin");
  });

  it("pliega a 75 bytes sin partir caracteres", () => {
    const folded = icsFold(`SUMMARY:${"é".repeat(60)}`);
    const parts = folded.split("\r\n");
    expect(parts.length).toBeGreaterThan(1);
    for (const p of parts) expect(new TextEncoder().encode(p).length).toBeLessThanOrEqual(75);
    expect(parts.map((p, i) => (i ? p.slice(1) : p)).join("")).toBe(`SUMMARY:${"é".repeat(60)}`);
  });

  it("un evento por elemento, con fin según la duración y líneas CRLF", () => {
    const ics = buildCalendar(
      [
        { uid: "lobby-1@teamfinder", start: new Date("2026-11-20T20:00:00Z"), minutes: 60, title: "Duo de VALORANT", url: "https://x.test/grupos/1" },
        { uid: "lobby-2@teamfinder", start: new Date("2026-11-21T20:00:00Z"), minutes: 120, title: "Quedada", description: "Nota" },
      ],
      { name: "TeamFinder", now: new Date("2026-11-14T10:00:00Z") },
    );
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain("DTSTART:20261120T200000Z\r\nDTEND:20261120T210000Z");
    expect(ics).toContain("DTEND:20261121T220000Z");
    expect(ics).toContain("DESCRIPTION:Nota");
    expect(ics).not.toMatch(/[^\r]\n/);
  });

  it("se descarga como text/calendar con un nombre de archivo seguro", () => {
    const res = calendarResponse("x", "TeamFinder-Duo «ranked»/../");
    expect(res.headers.get("Content-Type")).toBe("text/calendar; charset=utf-8");
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="teamfinder-duo-ranked.ics"');
  });
});

describe("uso de los planes gratuitos", () => {
  it("porcentaje con decimal por debajo del 1 % y aviso desde el 80 %", () => {
    expect(usage(5, 1000)).toEqual({ percent: 0.5, warn: false });
    expect(usage(800, 1000)).toEqual({ percent: 80, warn: true });
    expect(usage(1, 0)).toEqual({ percent: 0, warn: false });
  });

  it("tamaños en MB o GB", () => {
    expect(formatBytes(52_428_800, "es-ES")).toBe("50 MB");
    expect(formatBytes(1.5 * 1024 ** 3, "en-GB")).toBe("1.5 GB");
  });
});
