// Archivos de calendario (iCalendar, RFC 5545) para «Añadir al calendario»: Google Calendar, Apple y Outlook los
// importan. Sin dependencias: solo eventos con hora de inicio, duración, título, descripción y enlace.

export type CalendarEvent = {
  /** Identificador estable: al volver a importarlo, el calendario actualiza el evento en vez de duplicarlo. */
  uid: string;
  start: Date;
  minutes: number;
  title: string;
  description?: string;
  url?: string;
};

/** Fecha en UTC con el formato de iCalendar (20261114T183000Z). */
export function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Escapa el texto de una propiedad (barra invertida, punto y coma, coma y saltos de línea). */
export function icsText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Pliega las líneas de más de 75 bytes (UTF-8) como pide el estándar, sin partir caracteres. */
export function icsFold(line: string): string {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = "";
  for (const ch of line) {
    const limit = out.length === 0 ? 75 : 74; // las de continuación empiezan con un espacio
    if (enc.encode(cur + ch).length > limit) {
      out.push(cur);
      cur = ch;
    } else cur += ch;
  }
  out.push(cur);
  return out.join("\r\n ");
}

export function buildCalendar(events: CalendarEvent[], { name, now = new Date() }: { name: string; now?: Date }): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//TeamFinder//ES", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${icsText(name)}`];
  for (const e of events) {
    const end = new Date(e.start.getTime() + e.minutes * 60_000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}`,
      `DTSTAMP:${icsDate(now)}`,
      `DTSTART:${icsDate(e.start)}`,
      `DTEND:${icsDate(end)}`,
      `SUMMARY:${icsText(e.title)}`,
    );
    if (e.description) lines.push(`DESCRIPTION:${icsText(e.description)}`);
    if (e.url) lines.push(`URL:${e.url}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(icsFold).join("\r\n") + "\r\n";
}

/** Respuesta descargable (text/calendar) con un nombre de archivo seguro. */
export function calendarResponse(body: string, filename: string): Response {
  const safe = filename.replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "teamfinder";
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safe}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
