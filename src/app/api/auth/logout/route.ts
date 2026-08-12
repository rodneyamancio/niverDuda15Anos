import { NextResponse } from "next/server";
import { clearSessionCookie, getRole } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function POST() {
  const role = await getRole();
  await clearSessionCookie();
  if (role) {
    await audit({
      actor: role,
      action: "LOGOUT",
      entity: "session",
      summary: "Logout efetuado",
      method: "POST",
      path: "/api/auth/logout",
    });
  }
  return NextResponse.json({ ok: true });
}
