import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import es from "../../messages/es.json";
import { CLIENT_NAMESPACES, clientMessages } from "@/i18n/client-messages";

const SRC = resolve(__dirname, "../../src");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) ? [p] : [];
  });
}

/** Archivo local al que apunta un import («@/…» o relativo); null si es un paquete. */
function resolveImport(from: string, spec: string): string | null {
  const base = spec.startsWith("@/") ? join(SRC, spec.slice(2)) : spec.startsWith(".") ? resolve(dirname(from), spec) : null;
  if (!base) return null;
  for (const c of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")]) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

/** Todo el código que acaba en el navegador: los archivos "use client" y lo que importan (sin tipos). */
function clientGraph(): string[] {
  const queue = files(SRC).filter((f) => /^\s*["']use client["']/.test(readFileSync(f, "utf8")));
  const seen = new Set<string>();
  while (queue.length) {
    const f = queue.pop()!;
    if (seen.has(f)) continue;
    seen.add(f);
    for (const m of readFileSync(f, "utf8").matchAll(/^import\s+(?!type\b)[^;]*?from\s+["']([^"']+)["']/gm)) {
      const next = resolveImport(f, m[1]);
      if (next) queue.push(next);
    }
  }
  return [...seen];
}

describe("textos que viajan al cliente", () => {
  it("incluyen todos los espacios de nombres que usan los componentes de cliente", () => {
    const used = new Set<string>();
    for (const f of clientGraph()) {
      const src = readFileSync(f, "utf8");
      // useTranslations sin espacio de nombres literal no se puede comprobar: que no se use en cliente.
      expect(src, f).not.toMatch(/useTranslations\(\s*\)|useTranslations\(\s*[^"'\s)]/);
      expect(src, f).not.toMatch(/useMessages\(/);
      for (const m of src.matchAll(/useTranslations\(\s*["']([^"'.]+)/g)) used.add(m[1]);
    }
    expect(used.size).toBeGreaterThan(0);
    expect([...used].filter((ns) => !(CLIENT_NAMESPACES as readonly string[]).includes(ns))).toEqual([]);
  });

  it("solo mandan esos espacios de nombres", () => {
    expect(Object.keys(clientMessages(es)).sort()).toEqual([...CLIENT_NAMESPACES].sort());
    expect(JSON.stringify(clientMessages(es)).length).toBeLessThan(JSON.stringify(es).length);
  });
});
