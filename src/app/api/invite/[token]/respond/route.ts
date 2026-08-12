import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notifyGuestResponse } from "@/lib/notify";

const respondSchema = z.object({
  attending: z.boolean(),
});

type Params = { params: Promise<{ token: string }> };

export async function POST(request: Request, { params }: Params) {
  const { token } = await params;
  const body = await request.json().catch(() => null);
  const parsed = respondSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Resposta inválida" }, { status: 400 });
  }

  const guest = await prisma.guest.findUnique({ where: { token } });
  if (!guest) return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });

  const newStatus = parsed.data.attending ? "YES" : "NO";
  const updated = await prisma.guest.update({
    where: { token },
    data: {
      saveTheDate: newStatus,
      saveTheDateAt: new Date(),
    },
  });

  await audit({
    actor: `guest:${guest.name}`,
    action: "GUEST_RESPONDED",
    entity: "guest",
    entityId: guest.id,
    summary: `"${guest.name}" respondeu ao Save the Date: ${
      parsed.data.attending ? "pretende ir 🎉" : "não poderá ir"
    }`,
    before: { saveTheDate: guest.saveTheDate },
    after: { saveTheDate: newStatus },
    metadata: { token: guest.token, respostaAnterior: guest.saveTheDate !== "PENDING" },
    method: "POST",
    path: `/api/invite/${token}/respond`,
  });

  // Avisa os destinatários cadastrados no WhatsApp (não bloqueia em caso de falha)
  await notifyGuestResponse(updated, parsed.data.attending);

  return NextResponse.json({ status: updated.saveTheDate });
}
