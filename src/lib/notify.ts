import twilio from "twilio";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { normalizePhone } from "@/lib/send";
import { audit } from "@/lib/audit";
import type { Guest } from "@/generated/prisma/client";

/**
 * Avisa no WhatsApp os destinatários cadastrados sempre que um convidado
 * responde ao Save the Date. Nunca derruba o fluxo da resposta.
 */
export async function notifyGuestResponse(guest: Guest, attending: boolean): Promise<void> {
  try {
    const recipients = await prisma.notificationRecipient.findMany({ where: { active: true } });
    if (recipients.length === 0) return;

    const s = await getSettings();
    if (!s.twilioAccountSid || !s.twilioAuthToken || !s.twilioWhatsappFrom) {
      await audit({
        actor: "system",
        action: "NOTIFICATION_FAILED",
        entity: "notification",
        summary: `Não foi possível avisar sobre a resposta de "${guest.name}": credenciais Twilio não configuradas`,
        metadata: { destinatarios: recipients.map((r) => r.name) },
      });
      return;
    }

    const [yes, no, pending] = await Promise.all([
      prisma.guest.count({ where: { saveTheDate: "YES" } }),
      prisma.guest.count({ where: { saveTheDate: "NO" } }),
      prisma.guest.count({ where: { saveTheDate: "PENDING" } }),
    ]);

    const text = [
      `📣 *Resposta no Save the Date!*`,
      ``,
      attending
        ? `🎉 *${guest.name}* respondeu que *pretende ir*!`
        : `😢 *${guest.name}* respondeu que *não pretende ir*.`,
      ``,
      `Placar até agora:`,
      `✅ Pretendem ir: ${yes}`,
      `❌ Não pretendem ir: ${no}`,
      `⏳ Aguardando: ${pending}`,
    ].join("\n");

    const client = twilio(s.twilioAccountSid, s.twilioAuthToken);
    const results = await Promise.allSettled(
      recipients.map((r) => {
        const to = normalizePhone(r.phone, s.defaultCountryCode);
        if (!to) return Promise.reject(new Error(`Celular inválido: ${r.phone}`));
        return client.messages.create({
          from: `whatsapp:${s.twilioWhatsappFrom}`,
          to: `whatsapp:${to}`,
          body: text,
        });
      })
    );

    const detail = recipients.map((r, i) => ({
      nome: r.name,
      celular: r.phone,
      sucesso: results[i].status === "fulfilled",
      erro:
        results[i].status === "rejected"
          ? String((results[i] as PromiseRejectedResult).reason?.message ?? results[i])
          : null,
    }));
    const okCount = detail.filter((d) => d.sucesso).length;

    await audit({
      actor: "system",
      action: okCount > 0 ? "NOTIFICATION_SENT" : "NOTIFICATION_FAILED",
      entity: "notification",
      entityId: guest.id,
      summary: `Aviso da resposta de "${guest.name}" (${attending ? "pretende ir" : "não pretende ir"}) enviado para ${okCount}/${recipients.length} destinatário(s)`,
      metadata: { convidado: guest.name, resposta: attending ? "YES" : "NO", envios: detail },
    });
  } catch (e) {
    console.error("[notify] falha ao notificar resposta:", e);
  }
}
