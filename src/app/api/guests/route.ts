import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRole } from "@/lib/auth";
import { audit, guestSnapshot } from "@/lib/audit";

const guestSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório"),
  email: z.string().trim().email("E-mail inválido").optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});

export async function GET() {
  const role = await getRole();
  if (!role) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const guests = await prisma.guest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      messages: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  return NextResponse.json({ guests });
}

export async function POST(request: Request) {
  const role = await getRole();
  if (!role) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = guestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { name, email, phone, notes } = parsed.data;
  if (!email && !phone) {
    return NextResponse.json(
      { error: "Informe pelo menos e-mail ou celular para conseguir enviar o convite" },
      { status: 400 }
    );
  }

  const guest = await prisma.guest.create({
    data: {
      name,
      email: email || null,
      phone: phone || null,
      notes: notes || null,
    },
  });

  await audit({
    actor: role,
    action: "GUEST_CREATED",
    entity: "guest",
    entityId: guest.id,
    summary: `Convidado "${guest.name}" cadastrado`,
    after: guestSnapshot(guest),
    method: "POST",
    path: "/api/guests",
  });

  return NextResponse.json({ guest }, { status: 201 });
}
