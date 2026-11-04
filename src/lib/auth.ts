import { z } from "zod";
import { DEFAULT_AFTER_LOGIN, PROTECTED_PREFIXES } from "./config";

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));

/** Solo rutas internas: evita redirecciones abiertas (`//evil.com`, `https://…`, `/\evil`). */
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
    return DEFAULT_AFTER_LOGIN;
  }
  try {
    const url = new URL(raw, "http://internal.invalid");
    if (url.origin !== "http://internal.invalid") return DEFAULT_AFTER_LOGIN;
    return url.pathname + url.search;
  } catch {
    return DEFAULT_AFTER_LOGIN;
  }
}

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
