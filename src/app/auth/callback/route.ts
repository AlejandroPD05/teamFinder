import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Location relativa: conserva el host con el que llegó el usuario (las cookies de sesión van ligadas a él).
function redirectTo(path: string) {
  return new NextResponse(null, { status: 303, headers: { Location: path } });
}

// Destino de OAuth (Discord) y del enlace por correo (PKCE: ?code=…).
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"));
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return redirectTo(next);
  }

  const reason = searchParams.has("error") ? "oauth" : "callback";
  return redirectTo(`/entrar?error=${reason}`);
}
