import { NextResponse } from "next/server";
import { getRole } from "@/lib/auth";
import { getActivePhase } from "@/lib/settings";

export async function GET() {
  const role = await getRole();
  if (!role) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const phase = await getActivePhase();
  return NextResponse.json({ role, phase: { name: phase.name, endsAt: phase.endsAt } });
}
