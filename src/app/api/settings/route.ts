import { NextResponse } from "next/server";
import { z } from "zod";
import { getRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import {
  getSettings,
  saveSettings,
  maskSecret,
  isMaskedValue,
  SECRET_KEYS,
  type AppSettings,
} from "@/lib/settings";

const settingsSchema = z.object({
  eventName: z.string().trim().min(1).optional(),
  eventDate: z.string().trim().min(1).optional(),
  eventVenue: z.string().trim().optional(),
  eventCity: z.string().trim().optional(),
  appUrl: z.string().trim().url("URL do site inválida").optional(),
  primaryColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Cor primária inválida").optional(),
  secondaryColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Cor secundária inválida")
    .optional(),
  resendApiKey: z.string().trim().optional(),
  emailFrom: z.string().trim().optional(),
  twilioAccountSid: z.string().trim().optional(),
  twilioAuthToken: z.string().trim().optional(),
  twilioWhatsappFrom: z.string().trim().optional(),
  defaultCountryCode: z.string().trim().regex(/^\d{1,3}$/, "DDI inválido").optional(),
});

function withMaskedSecrets(s: AppSettings): Record<string, string> {
  const out: Record<string, string> = { ...s };
  for (const key of SECRET_KEYS) out[key] = maskSecret(s[key]);
  return out;
}

export async function GET() {
  if (!((await getRole()) === "superadmin")) {
    return NextResponse.json({ error: "Apenas o super admin pode acessar" }, { status: 403 });
  }
  const settings = await getSettings();
  return NextResponse.json({ settings: withMaskedSecrets(settings) });
}

export async function PUT(request: Request) {
  const role = await getRole();
  if (role !== "superadmin") {
    return NextResponse.json({ error: "Apenas o super admin pode alterar" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const current = await getSettings();
  const incoming = parsed.data as Partial<Record<keyof AppSettings, string>>;

  // Valores mascarados ("••••xxxx") significam "não alterar o segredo"
  const changes: Partial<Record<keyof AppSettings, string>> = {};
  for (const [key, value] of Object.entries(incoming) as [keyof AppSettings, string][]) {
    if (value === undefined) continue;
    if (SECRET_KEYS.includes(key) && isMaskedValue(value)) continue;
    if (value === current[key]) continue;
    changes[key] = value;
  }

  if (Object.keys(changes).length === 0) {
    return NextResponse.json({ ok: true, changed: [] });
  }

  await saveSettings(changes);

  // Auditoria com diff (segredos mascarados)
  const maskIfSecret = (key: keyof AppSettings, value: string) =>
    SECRET_KEYS.includes(key) ? maskSecret(value) : value;
  const beforeDiff: Record<string, string> = {};
  const afterDiff: Record<string, string> = {};
  for (const key of Object.keys(changes) as (keyof AppSettings)[]) {
    beforeDiff[key] = maskIfSecret(key, current[key]);
    afterDiff[key] = maskIfSecret(key, changes[key] ?? "");
  }

  await audit({
    actor: role,
    action: "SETTINGS_UPDATED",
    entity: "settings",
    summary: `Configurações alteradas: ${Object.keys(changes).join(", ")}`,
    before: beforeDiff,
    after: afterDiff,
    metadata: { camposAlterados: Object.keys(changes) },
    method: "PUT",
    path: "/api/settings",
  });

  const updated = await getSettings();
  return NextResponse.json({
    ok: true,
    changed: Object.keys(changes),
    settings: withMaskedSecrets(updated),
  });
}
