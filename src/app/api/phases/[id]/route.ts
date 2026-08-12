import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRole } from "@/lib/auth";
import { audit } from "@/lib/audit";

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().optional().or(z.literal("")),
  endsAt: z.string().trim().optional().or(z.literal("")),
  activate: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

function snapshot(p: { name: string; description: string | null; endsAt: Date | null; status: string }) {
  return {
    nome: p.name,
    descricao: p.description,
    encerramentoPrevisto: p.endsAt?.toISOString() ?? null,
    status: p.status,
  };
}

export async function PATCH(request: Request, { params }: Params) {
  const role = await getRole();
  if (role !== "superadmin") {
    return NextResponse.json({ error: "Apenas o super admin pode alterar fases" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const before = await prisma.eventPhase.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Fase não encontrada" }, { status: 404 });

  const { name, description, endsAt, activate } = parsed.data;

  if (activate) {
    // Ativa esta fase e encerra a que estava ativa
    const [, phase] = await prisma.$transaction([
      prisma.eventPhase.updateMany({
        where: { status: "ACTIVE", id: { not: id } },
        data: { status: "CLOSED" },
      }),
      prisma.eventPhase.update({ where: { id }, data: { status: "ACTIVE" } }),
    ]);

    await audit({
      actor: role,
      action: "PHASE_ACTIVATED",
      entity: "phase",
      entityId: id,
      summary: `Fase "${phase.name}" ativada (a anterior foi encerrada)`,
      before: snapshot(before),
      after: snapshot(phase),
      method: "PATCH",
      path: `/api/phases/${id}`,
    });
    return NextResponse.json({ phase });
  }

  const phase = await prisma.eventPhase.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description: description || null }),
      ...(endsAt !== undefined && { endsAt: endsAt ? new Date(endsAt) : null }),
    },
  });

  await audit({
    actor: role,
    action: "PHASE_UPDATED",
    entity: "phase",
    entityId: id,
    summary: `Fase "${phase.name}" editada`,
    before: snapshot(before),
    after: snapshot(phase),
    method: "PATCH",
    path: `/api/phases/${id}`,
  });

  return NextResponse.json({ phase });
}

export async function DELETE(_request: Request, { params }: Params) {
  const role = await getRole();
  if (role !== "superadmin") {
    return NextResponse.json({ error: "Apenas o super admin pode remover fases" }, { status: 403 });
  }

  const { id } = await params;
  const before = await prisma.eventPhase.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Fase não encontrada" }, { status: 404 });
  if (before.status === "ACTIVE") {
    return NextResponse.json(
      { error: "Não é possível remover a fase ativa. Ative outra fase primeiro." },
      { status: 400 }
    );
  }

  await prisma.eventPhase.delete({ where: { id } });

  await audit({
    actor: role,
    action: "PHASE_DELETED",
    entity: "phase",
    entityId: id,
    summary: `Fase "${before.name}" removida`,
    before: snapshot(before),
    method: "DELETE",
    path: `/api/phases/${id}`,
  });

  return NextResponse.json({ ok: true });
}
