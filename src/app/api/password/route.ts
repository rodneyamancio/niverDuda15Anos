import { NextResponse } from "next/server";
import { z } from "zod";
import { getRole, setPassword, verifyRolePassword } from "@/lib/auth";
import { audit } from "@/lib/audit";

const passwordSchema = z.object({
  target: z.enum(["admin", "superadmin"]),
  currentPassword: z.string().min(1, "Informe sua senha atual"),
  newPassword: z.string().min(8, "A nova senha precisa ter pelo menos 8 caracteres"),
});

export async function POST(request: Request) {
  const role = await getRole();
  if (!role) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = passwordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { target, currentPassword, newPassword } = parsed.data;

  // Admin comum só troca a própria senha; super admin troca as duas
  if (role === "admin" && target !== "admin") {
    return NextResponse.json(
      { error: "Apenas o super admin pode trocar a senha do super admin" },
      { status: 403 }
    );
  }

  // Confirma a senha atual de quem está logado
  const confirmed = await verifyRolePassword(role, currentPassword);
  if (!confirmed) {
    await audit({
      actor: role,
      action: "PASSWORD_CHANGED",
      entity: "session",
      summary: `Tentativa de trocar a senha do ${target === "superadmin" ? "super admin" : "admin"} falhou: senha atual incorreta`,
      metadata: { alvo: target, sucesso: false },
      method: "POST",
      path: "/api/password",
    });
    return NextResponse.json({ error: "Sua senha atual está incorreta" }, { status: 401 });
  }

  await setPassword(target, newPassword);

  await audit({
    actor: role,
    action: "PASSWORD_CHANGED",
    entity: "session",
    summary: `Senha do ${target === "superadmin" ? "super admin" : "admin"} alterada`,
    metadata: { alvo: target, sucesso: true },
    method: "POST",
    path: "/api/password",
  });

  return NextResponse.json({ ok: true });
}
