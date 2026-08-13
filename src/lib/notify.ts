import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { normalizePhone, sendWhatsAppText } from "@/lib/send";
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

    const results = await Promise.all(
      recipients.map(async (r) => {
        const to = normalizePhone(r.phone, s.defaultCountryCode);
        if (!to) return { success: false, error: `Celular inválido: ${r.phone}` };
        return sendWhatsAppText(to, text, s);
      })
    );

    const detail = recipients.map((r, i) => ({
      nome: r.name,
      celular: r.phone,
      sucesso: results[i].success,
      erro: results[i].error ?? null,
    }));
    const okCount = detail.filter((d) => d.sucesso).length;

    await audit({
      actor: "system",
      action: okCount > 0 ? "NOTIFICATION_SENT" : "NOTIFICATION_FAILED",
      entity: "notification",
      entityId: guest.id,
      summary: `Aviso da resposta de "${guest.name}" (${attending ? "pretende ir" : "não pretende ir"}) enviado para ${okCount}/${recipients.length} destinatário(s)`,
      metadata: {
        convidado: guest.name,
        resposta: attending ? "YES" : "NO",
        provedor: s.whatsappProvider,
        envios: detail,
      },
    });
  } catch (e) {
    console.error("[notify] falha ao notificar resposta:", e);
  }
}
