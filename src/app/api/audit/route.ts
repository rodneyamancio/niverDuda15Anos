import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRole } from "@/lib/auth";
import type { Prisma } from "@/generated/prisma/client";

const PAGE_SIZE = 50;

export async function GET(request: Request) {
  if ((await getRole()) !== "superadmin") {
    return NextResponse.json({ error: "Apenas o super admin pode acessar" }, { status: 403 });
  }

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const action = url.searchParams.get("action") || undefined;
  const q = url.searchParams.get("q")?.trim() || undefined;

  const where: Prisma.AuditLogWhereInput = {
    ...(action && { action }),
    ...(q && {
      OR: [
        { summary: { contains: q, mode: "insensitive" } },
        { actor: { contains: q, mode: "insensitive" } },
        { ip: { contains: q } },
      ],
    }),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return NextResponse.json({ logs, total, page, pageSize: PAGE_SIZE });
}
