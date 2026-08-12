import { NextResponse } from "next/server";
import { checkPassword, setSessionCookie } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  const role = await checkPassword(password);
  if (!role) {
    await audit({
      actor: "unknown",
      action: "LOGIN_FAILED",
      entity: "session",
      summary: "Tentativa de login com senha incorreta",
      method: "POST",
      path: "/api/auth/login",
    });
    return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
  }

  await setSessionCookie(role);
  await audit({
    actor: role,
    action: "LOGIN_SUCCESS",
    entity: "session",
    summary: `Login efetuado como ${role === "superadmin" ? "super admin" : "admin"}`,
    method: "POST",
    path: "/api/auth/login",
  });
  return NextResponse.json({ ok: true, role });
}
