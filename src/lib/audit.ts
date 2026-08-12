import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export type AuditAction =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "GUEST_CREATED"
  | "GUEST_UPDATED"
  | "GUEST_DELETED"
  | "INVITE_SENT"
  | "INVITE_SEND_FAILED"
  | "GUEST_RESPONDED"
  | "SETTINGS_UPDATED"
  | "PHASE_CREATED"
  | "PHASE_UPDATED"
  | "PHASE_ACTIVATED"
  | "PHASE_DELETED"
  | "NOTIFIER_CREATED"
  | "NOTIFIER_UPDATED"
  | "NOTIFIER_DELETED"
  | "NOTIFICATION_SENT"
  | "NOTIFICATION_FAILED"
  | "PASSWORD_CHANGED";

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  LOGIN_SUCCESS: "Login efetuado",
  LOGIN_FAILED: "Tentativa de login falhou",
  LOGOUT: "Logout",
  GUEST_CREATED: "Convidado cadastrado",
  GUEST_UPDATED: "Convidado editado",
  GUEST_DELETED: "Convidado removido",
  INVITE_SENT: "Convite enviado",
  INVITE_SEND_FAILED: "Falha no envio de convite",
  GUEST_RESPONDED: "Convidado respondeu",
  SETTINGS_UPDATED: "Configurações alteradas",
  PHASE_CREATED: "Fase cadastrada",
  PHASE_UPDATED: "Fase editada",
  PHASE_ACTIVATED: "Fase ativada",
  PHASE_DELETED: "Fase removida",
  NOTIFIER_CREATED: "Destinatário de notificação cadastrado",
  NOTIFIER_UPDATED: "Destinatário de notificação editado",
  NOTIFIER_DELETED: "Destinatário de notificação removido",
  NOTIFICATION_SENT: "Notificação WhatsApp enviada",
  NOTIFICATION_FAILED: "Falha na notificação WhatsApp",
  PASSWORD_CHANGED: "Senha alterada",
};

interface AuditEntry {
  actor: string;
  action: AuditAction;
  summary: string;
  entity?: string;
  entityId?: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
  method?: string;
  path?: string;
}

/**
 * Registra um evento de auditoria com o máximo de contexto disponível
 * (IP, user agent, método e rota). Nunca derruba o fluxo principal.
 */
export async function audit(entry: AuditEntry): Promise<void> {
  try {
    const h = await headers();
    const ip =
      h.get("x-forwarded-for")?.split(",")[0].trim() ??
      h.get("x-real-ip") ??
      null;
    const userAgent = h.get("user-agent");

    await prisma.auditLog.create({
      data: {
        actor: entry.actor,
        action: entry.action,
        summary: entry.summary,
        entity: entry.entity,
        entityId: entry.entityId,
        before: entry.before,
        after: entry.after,
        metadata: entry.metadata,
        ip,
        userAgent,
        method: entry.method,
        path: entry.path,
      },
    });
  } catch (e) {
    console.error("[audit] falha ao registrar evento:", e);
  }
}

/** Snapshot de convidado para gravar em before/after (sem campos internos). */
export function guestSnapshot(g: {
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  saveTheDate: string;
  rsvpStatus: string;
}) {
  return {
    nome: g.name,
    email: g.email,
    celular: g.phone,
    observacoes: g.notes,
    saveTheDate: g.saveTheDate,
    rsvp: g.rsvpStatus,
  };
}
