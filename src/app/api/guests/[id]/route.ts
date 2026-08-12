import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRole } from "@/lib/auth";
import { audit, guestSnapshot } from "@/lib/audit";

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const role = await getRole();
  if (!role) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const before = await prisma.guest.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Convidado não encontrado" }, { status: 404 });

  const { name, email, phone, notes } = parsed.data;
  const guest = await prisma.guest.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email: email || null }),
      ...(phone !== undefined && { phone: phone || null }),
      ...(notes !== undefined && { notes: notes || null }),
    },
  });

  await audit({
    actor: role,
    action: "GUEST_UPDATED",
    entity: "guest",
    entityId: guest.id,
    summary: `Convidado "${guest.name}" editado`,
    before: guestSnapshot(before),
    after: guestSnapshot(guest),
    method: "PATCH",
    path: `/api/guests/${id}`,
  });

  return NextResponse.json({ guest });
}

export async function DELETE(_request: Request, { params }: Params) {
  const role = await getRole();
  if (!role) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const before = await prisma.guest.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Convidado não encontrado" }, { status: 404 });

  await prisma.guest.delete({ where: { id } });

  await audit({
    actor: role,
    action: "GUEST_DELETED",
    entity: "guest",
    entityId: id,
    summary: `Convidado "${before.name}" removido`,
    before: guestSnapshot(before),
    method: "DELETE",
    path: `/api/guests/${id}`,
  });

  return NextResponse.json({ ok: true });
}
