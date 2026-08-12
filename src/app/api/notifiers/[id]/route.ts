import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRole } from "@/lib/auth";
import { audit } from "@/lib/audit";

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  phone: z.string().trim().min(8).optional(),
  active: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const role = await getRole();
  if (role !== "superadmin") {
    return NextResponse.json({ error: "Apenas o super admin pode alterar" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const before = await prisma.notificationRecipient.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Destinatário não encontrado" }, { status: 404 });

  const notifier = await prisma.notificationRecipient.update({ where: { id }, data: parsed.data });

  await audit({
    actor: role,
    action: "NOTIFIER_UPDATED",
    entity: "notifier",
    entityId: id,
    summary:
      parsed.data.active !== undefined && Object.keys(parsed.data).length === 1
        ? `Avisos no WhatsApp ${notifier.active ? "reativados" : "pausados"} para "${notifier.name}"`
        : `Destinatário "${notifier.name}" editado`,
    before: { nome: before.name, celular: before.phone, ativo: before.active },
    after: { nome: notifier.name, celular: notifier.phone, ativo: notifier.active },
    method: "PATCH",
    path: `/api/notifiers/${id}`,
  });

  return NextResponse.json({ notifier });
}

export async function DELETE(_request: Request, { params }: Params) {
  const role = await getRole();
  if (role !== "superadmin") {
    return NextResponse.json({ error: "Apenas o super admin pode remover" }, { status: 403 });
  }

  const { id } = await params;
  const before = await prisma.notificationRecipient.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Destinatário não encontrado" }, { status: 404 });

  await prisma.notificationRecipient.delete({ where: { id } });

  await audit({
    actor: role,
    action: "NOTIFIER_DELETED",
    entity: "notifier",
    entityId: id,
    summary: `"${before.name}" (${before.phone}) não receberá mais avisos no WhatsApp`,
    before: { nome: before.name, celular: before.phone, ativo: before.active },
    method: "DELETE",
    path: `/api/notifiers/${id}`,
  });

  return NextResponse.json({ ok: true });
}
