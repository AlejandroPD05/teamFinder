/**
 * Fiabilidad: datos objetivos de los últimos 90 días que calcula la base de datos (`player_reliability`).
 * No es una puntuación ni una sanción: se enseñan los hechos y solo cuando hay datos suficientes (los porcentajes
 * llegan a null por debajo de 3 casos).
 */
export type Reliability = {
  finished: number;
  left: number;
  completion_pct: number | null;
  responded: number;
  response_pct: number | null;
  median_response_min: number | null;
};

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

export function parseReliability(raw: unknown): Reliability | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  return {
    finished: num(r.finished) ?? 0,
    left: num(r.left) ?? 0,
    completion_pct: num(r.completion_pct),
    responded: num(r.responded) ?? 0,
    response_pct: num(r.response_pct),
    median_response_min: num(r.median_response_min),
  };
}

export type ReliabilityFact =
  | { key: "completion"; pct: number; finished: number; total: number }
  | { key: "response"; pct: number }
  | { key: "responseTime"; minutes: number };

/** Los hechos que se pueden enseñar (vacío = aún no hay datos suficientes). */
export function reliabilityFacts(r: Reliability | null): ReliabilityFact[] {
  if (!r) return [];
  const facts: ReliabilityFact[] = [];
  if (r.completion_pct != null) facts.push({ key: "completion", pct: r.completion_pct, finished: r.finished, total: r.finished + r.left });
  if (r.response_pct != null) facts.push({ key: "response", pct: r.response_pct });
  if (r.median_response_min != null) facts.push({ key: "responseTime", minutes: r.median_response_min });
  return facts;
}

/** «12 min», «2 h», «1 d» (para el tiempo de respuesta típico). */
export function shortDuration(minutes: number): { unit: "min" | "h" | "d"; value: number } {
  if (minutes < 60) return { unit: "min", value: Math.max(1, Math.round(minutes)) };
  if (minutes < 48 * 60) return { unit: "h", value: Math.round(minutes / 60) };
  return { unit: "d", value: Math.round(minutes / 1440) };
}
