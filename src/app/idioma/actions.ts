"use server";

import { cookies } from "next/headers";
import { isLocale, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from "@/lib/i18n/locale";

/** Selector de idioma del pie: guarda la cookie. Al cambiar una cookie en una acción, Next vuelve a pintar la página. */
export async function setLocale(formData: FormData) {
  const lang = formData.get("lang");
  if (!isLocale(lang)) return;
  (await cookies()).set(LOCALE_COOKIE, lang, { path: "/", maxAge: LOCALE_COOKIE_MAX_AGE, sameSite: "lax", httpOnly: true });
}
