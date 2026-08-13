import { prisma } from "@/lib/prisma";

export interface AppSettings {
  eventName: string;
  eventDate: string; // ISO, ex: 2026-12-12T20:00:00-03:00
  eventVenue: string;
  eventCity: string;
  appUrl: string;
  primaryColor: string;
  secondaryColor: string;
  resendApiKey: string;
  emailFrom: string;
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioWhatsappFrom: string;
  defaultCountryCode: string;
  whatsappProvider: string; // "evolution" | "twilio"
  evolutionApiUrl: string;
  evolutionApiKey: string;
  evolutionInstance: string;
}

/** Valores padrão — vêm do .env; o que for salvo no banco (tela de config) tem prioridade. */
function defaults(): AppSettings {
  return {
    eventName: process.env.NEXT_PUBLIC_EVENT_NAME ?? "15 Anos da Duda",
    eventDate: process.env.NEXT_PUBLIC_EVENT_DATE ?? "2026-12-12T20:00:00-03:00",
    eventVenue: process.env.NEXT_PUBLIC_EVENT_VENUE ?? "Local a confirmar",
    eventCity: process.env.NEXT_PUBLIC_EVENT_CITY ?? "",
    appUrl: (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
    primaryColor: "#5b2c8d",
    secondaryColor: "#9d4edd",
    resendApiKey: process.env.RESEND_API_KEY ?? "",
    emailFrom: process.env.EMAIL_FROM ?? "Festa <onboarding@resend.dev>",
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ?? "",
    twilioWhatsappFrom: process.env.TWILIO_WHATSAPP_FROM ?? "",
    defaultCountryCode: process.env.DEFAULT_COUNTRY_CODE ?? "55",
    whatsappProvider: process.env.WHATSAPP_PROVIDER ?? "evolution",
    evolutionApiUrl: (process.env.EVOLUTION_API_URL ?? "http://evolution:8080").replace(/\/$/, ""),
    evolutionApiKey: process.env.EVOLUTION_API_KEY ?? "",
    evolutionInstance: process.env.EVOLUTION_INSTANCE ?? "festa-duda",
  };
}

export const SETTING_KEYS = Object.keys(defaults()) as (keyof AppSettings)[];

/** Chaves sensíveis — nunca saem da API sem máscara e são mascaradas na auditoria. */
export const SECRET_KEYS: (keyof AppSettings)[] = [
  "resendApiKey",
  "twilioAccountSid",
  "twilioAuthToken",
  "evolutionApiKey",
];

export function maskSecret(value: string): string {
  if (!value) return "";
  return `••••${value.slice(-4)}`;
}

export function isMaskedValue(value: string): boolean {
  return value.startsWith("••••");
}

export async function getSettings(): Promise<AppSettings> {
  const rows = await prisma.setting.findMany();
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const merged = defaults();
  for (const key of SETTING_KEYS) {
    const dbValue = map.get(key);
    if (dbValue !== undefined && dbValue !== "") {
      merged[key] = dbValue;
    }
  }
  return merged;
}

export async function saveSettings(partial: Partial<Record<keyof AppSettings, string>>) {
  const entries = Object.entries(partial).filter(([key]) =>
    SETTING_KEYS.includes(key as keyof AppSettings)
  );
  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        create: { key, value: value ?? "" },
        update: { value: value ?? "" },
      })
    )
  );
}

export function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });
}

export function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

export function inviteUrl(settings: AppSettings, token: string): string {
  return `${settings.appUrl}/convite/${token}`;
}

export interface PhaseInfo {
  id: string;
  name: string;
  description: string | null;
  endsAt: Date | null;
  status: "PLANNED" | "ACTIVE" | "CLOSED";
  order: number;
}

/** Fase ativa do evento (fallback: Save the Date). */
export async function getActivePhase(): Promise<PhaseInfo> {
  const phase = await prisma.eventPhase.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { order: "asc" },
  });
  return (
    phase ?? {
      id: "fallback",
      name: "Save the Date",
      description: null,
      endsAt: null,
      status: "ACTIVE" as const,
      order: 0,
    }
  );
}

export async function getPhases(): Promise<PhaseInfo[]> {
  return prisma.eventPhase.findMany({ orderBy: { order: "asc" } });
}
