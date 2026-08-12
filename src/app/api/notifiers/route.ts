import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRole } from "@/lib/auth";
import { audit } from "@/lib/audit";

const notifierSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório"),
  phone: z.string().trim().min(8, "Celular inválido"),
});

export async function GET() {
  if ((await getRole()) !== "superadmin") {
    return NextResponse.json({ error: "Apenas o super admin pode acessar" }, { status: 403 });
  }
  const notifiers = await prisma.notificationRecipient.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({ notifiers });
}

export async function POST(request: Request) {
  const role = await getRole();
  if (role !== "superadmin") {
    return NextResponse.json({ error: "Apenas o super admin pode cadastrar" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = notifierSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const notifier = await prisma.notificationRecipient.create({ data: parsed.data });

  await audit({
    actor: role,
    action: "NOTIFIER_CREATED",
    entity: "notifier",
    entityId: notifier.id,
    summary: `"${notifier.name}" (${notifier.phone}) passará a receber avisos de resposta no WhatsApp`,
    after: { nome: notifier.name, celular: notifier.phone, ativo: notifier.active },
    method: "POST",
    path: "/api/notifiers",
  });

  return NextResponse.json({ notifier }, { status: 201 });
}
