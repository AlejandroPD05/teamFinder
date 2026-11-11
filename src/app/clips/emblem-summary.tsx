import type { ClipItem, Emblem } from "@/lib/clips/queries";

/** Resumen de emblemas recibidos: nombre y número, solo los que tienen alguno. */
export function EmblemSummary({ clip, emblems }: { clip: ClipItem; emblems: Emblem[] }) {
  const given = emblems.filter((e) => clip.votes[e.id]);
  if (given.length === 0) return <p className="text-xs text-muted">Sin emblemas todavía</p>;
  return (
    <ul aria-label="Emblemas recibidos" className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
      {given.map((e) => (
        <li key={e.id}>
          {e.name} <span className="tabular-nums text-muted">{clip.votes[e.id]}</span>
        </li>
      ))}
    </ul>
  );
}
