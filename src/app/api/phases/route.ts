import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRole } from "@/lib/auth";
import { audit } from "@/lib/audit";

const phaseSchema = z.object({
  name: z.string().trim().min(1, "Nome da fase é obrigatório"),
  description: z.string().trim().optional().or(z.literal("")),
  endsAt: z.string().trim().optional().or(z.literal("")), // ISO date (data prevista de encerramento)
});

export async function GET() {
  if (!(await getRole())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const phases = await prisma.eventPhase.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json({ phases });
}

export async function POST(request: Request) {
  const role = await getRole();
  if (role !== "superadmin") {
    return NextResponse.json({ error: "Apenas o super admin pode cadastrar fases" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = phaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const maxOrder = await prisma.eventPhase.aggregate({ _max: { order: true } });
  const phase = await prisma.eventPhase.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
      order: (maxOrder._max.order ?? 0) + 1,
    },
  });

  await audit({
    actor: role,
    action: "PHASE_CREATED",
    entity: "phase",
    entityId: phase.id,
    summary: `Fase "${phase.name}" cadastrada${
      phase.endsAt ? ` (encerramento previsto: ${phase.endsAt.toLocaleDateString("pt-BR")})` : ""
    }`,
    after: {
      nome: phase.name,
      descricao: phase.description,
      encerramentoPrevisto: phase.endsAt?.toISOString() ?? null,
      status: phase.status,
    },
    method: "POST",
    path: "/api/phases",
  });

  return NextResponse.json({ phase }, { status: 201 });
}
