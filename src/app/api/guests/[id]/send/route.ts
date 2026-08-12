import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRole } from "@/lib/auth";
import { sendInvite } from "@/lib/send";
import { audit } from "@/lib/audit";

const sendSchema = z.object({
  channels: z.array(z.enum(["email", "whatsapp"])).min(1, "Escolha pelo menos um canal"),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const role = await getRole();
  if (!role) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const guest = await prisma.guest.findUnique({ where: { id } });
  if (!guest) return NextResponse.json({ error: "Convidado não encontrado" }, { status: 404 });

  const results = await sendInvite(guest, parsed.data.channels);

  for (const r of results) {
    const channelLabel = r.channel === "email" ? "e-mail" : "WhatsApp";
    await audit({
      actor: role,
      action: r.success ? "INVITE_SENT" : "INVITE_SEND_FAILED",
      entity: "guest",
      entityId: guest.id,
      summary: r.success
        ? `Save the Date enviado por ${channelLabel} para "${guest.name}"`
        : `Falha ao enviar Save the Date por ${channelLabel} para "${guest.name}"`,
      metadata: {
        canal: r.channel,
        destinatario: r.to ?? null,
        sucesso: r.success,
        erro: r.error ?? null,
        fase: "SAVE_THE_DATE",
      },
      method: "POST",
      path: `/api/guests/${id}/send`,
    });
  }

  const anySuccess = results.some((r) => r.success);
  return NextResponse.json({ results }, { status: anySuccess ? 200 : 502 });
}
