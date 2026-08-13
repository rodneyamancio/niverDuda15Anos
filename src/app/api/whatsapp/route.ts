import { NextResponse } from "next/server";
import { getRole } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { connectAndGetQr, evolutionConfigured, getConnectionState } from "@/lib/evolution";

/** Status da conexão do WhatsApp (Evolution API). Só super admin. */
export async function GET() {
  if ((await getRole()) !== "superadmin") {
    return NextResponse.json({ error: "Apenas o super admin pode acessar" }, { status: 403 });
  }
  const s = await getSettings();
  if (s.whatsappProvider !== "evolution") {
    return NextResponse.json({ provider: s.whatsappProvider, state: "n/a" });
  }
  if (!evolutionConfigured(s)) {
    return NextResponse.json({ provider: "evolution", state: "unconfigured" });
  }
  try {
    const state = await getConnectionState(s);
    return NextResponse.json({ provider: "evolution", state });
  } catch {
    return NextResponse.json({ provider: "evolution", state: "unreachable" });
  }
}

/** Gera/renova o QR code de conexão. Só super admin. */
export async function POST() {
  if ((await getRole()) !== "superadmin") {
    return NextResponse.json({ error: "Apenas o super admin pode acessar" }, { status: 403 });
  }
  const s = await getSettings();
  if (s.whatsappProvider !== "evolution") {
    return NextResponse.json(
      { error: "O provedor configurado não é o Evolution API" },
      { status: 400 }
    );
  }
  if (!evolutionConfigured(s)) {
    return NextResponse.json(
      { error: "Configure URL, API key e instância do Evolution primeiro (e salve)" },
      { status: 400 }
    );
  }
  try {
    const result = await connectAndGetQr(s);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Não foi possível falar com o Evolution API — confira a URL e se o container está no ar" },
      { status: 502 }
    );
  }
}
