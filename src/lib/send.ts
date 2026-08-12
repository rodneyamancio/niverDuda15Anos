import { Resend } from "resend";
import twilio from "twilio";
import { prisma } from "@/lib/prisma";
import { emailHtml, emailSubject, whatsappText } from "@/lib/messages";
import { getSettings, type AppSettings } from "@/lib/settings";
import type { Guest } from "@/generated/prisma/client";

export type SendChannel = "email" | "whatsapp";

export interface SendResult {
  channel: SendChannel;
  success: boolean;
  error?: string;
  to?: string;
}

/** Normaliza celular BR: remove máscara e garante código do país (+55). */
export function normalizePhone(raw: string, countryCode: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith(countryCode) && digits.length >= 12) return `+${digits}`;
  if (digits.length === 10 || digits.length === 11) return `+${countryCode}${digits}`;
  return `+${digits}`;
}

async function sendEmail(guest: Guest, s: AppSettings): Promise<SendResult> {
  if (!guest.email) {
    return { channel: "email", success: false, error: "Convidado sem e-mail cadastrado" };
  }
  if (!s.resendApiKey) {
    return {
      channel: "email",
      success: false,
      error: "Chave do Resend não configurada (Configurações ou .env)",
    };
  }

  try {
    const resend = new Resend(s.resendApiKey);
    const { error } = await resend.emails.send({
      from: s.emailFrom,
      to: guest.email,
      subject: emailSubject(s),
      html: emailHtml(guest.name, guest.token, s),
    });
    if (error) return { channel: "email", success: false, error: error.message, to: guest.email };
    return { channel: "email", success: true, to: guest.email };
  } catch (e) {
    return {
      channel: "email",
      success: false,
      error: e instanceof Error ? e.message : "Erro desconhecido",
      to: guest.email,
    };
  }
}

async function sendWhatsApp(guest: Guest, s: AppSettings): Promise<SendResult> {
  if (!guest.phone) {
    return { channel: "whatsapp", success: false, error: "Convidado sem celular cadastrado" };
  }
  if (!s.twilioAccountSid || !s.twilioAuthToken || !s.twilioWhatsappFrom) {
    return {
      channel: "whatsapp",
      success: false,
      error: "Credenciais Twilio não configuradas (Configurações ou .env)",
    };
  }
  const to = normalizePhone(guest.phone, s.defaultCountryCode);
  if (!to) return { channel: "whatsapp", success: false, error: "Celular inválido" };

  try {
    const client = twilio(s.twilioAccountSid, s.twilioAuthToken);
    await client.messages.create({
      from: `whatsapp:${s.twilioWhatsappFrom}`,
      to: `whatsapp:${to}`,
      body: whatsappText(guest.name, guest.token, s),
    });
    return { channel: "whatsapp", success: true, to };
  } catch (e) {
    return {
      channel: "whatsapp",
      success: false,
      error: e instanceof Error ? e.message : "Erro desconhecido",
      to,
    };
  }
}

export async function sendInvite(guest: Guest, channels: SendChannel[]): Promise<SendResult[]> {
  const settings = await getSettings();
  const results: SendResult[] = [];
  for (const channel of channels) {
    const result =
      channel === "email" ? await sendEmail(guest, settings) : await sendWhatsApp(guest, settings);
    results.push(result);
    await prisma.messageLog.create({
      data: {
        guestId: guest.id,
        channel: channel === "email" ? "EMAIL" : "WHATSAPP",
        kind: "SAVE_THE_DATE",
        success: result.success,
        error: result.error,
      },
    });
  }
  return results;
}
