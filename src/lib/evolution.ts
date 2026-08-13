import type { AppSettings } from "@/lib/settings";

/**
 * Cliente mínimo do Evolution API (https://doc.evolution-api.com)
 * — gateway de WhatsApp self-hosted, conectado por QR code.
 */

function headers(s: AppSettings): Record<string, string> {
  return { "Content-Type": "application/json", apikey: s.evolutionApiKey };
}

async function evoFetch(
  s: AppSettings,
  path: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const res = await fetch(`${s.evolutionApiUrl}${path}`, {
    ...init,
    headers: { ...headers(s), ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data };
}

export function evolutionConfigured(s: AppSettings): boolean {
  return Boolean(s.evolutionApiUrl && s.evolutionApiKey && s.evolutionInstance);
}

/** Cria a instância se ainda não existir. */
export async function ensureInstance(s: AppSettings): Promise<void> {
  const state = await evoFetch(s, `/instance/connectionState/${s.evolutionInstance}`);
  if (state.ok) return;
  await evoFetch(s, "/instance/create", {
    method: "POST",
    body: JSON.stringify({
      instanceName: s.evolutionInstance,
      integration: "WHATSAPP-BAILEYS",
      qrcode: true,
    }),
  });
}

export type EvolutionState = "open" | "connecting" | "close" | "unknown";

export async function getConnectionState(s: AppSettings): Promise<EvolutionState> {
  const res = await evoFetch(s, `/instance/connectionState/${s.evolutionInstance}`);
  if (!res.ok) return "unknown";
  const d = res.data as { instance?: { state?: string } } | null;
  const state = d?.instance?.state;
  if (state === "open" || state === "connecting" || state === "close") return state;
  return "unknown";
}

/** Pede a conexão e retorna o QR code (base64) para escanear, se houver. */
export async function connectAndGetQr(
  s: AppSettings
): Promise<{ state: EvolutionState; qrBase64: string | null; pairingCode: string | null }> {
  await ensureInstance(s);
  const res = await evoFetch(s, `/instance/connect/${s.evolutionInstance}`);
  const d = res.data as { base64?: string; code?: string; pairingCode?: string } | null;
  const state = await getConnectionState(s);
  return {
    state,
    qrBase64: d?.base64 ?? null,
    pairingCode: d?.pairingCode ?? null,
  };
}

/** Envia texto. `toE164` no formato +5511999998888. */
export async function evolutionSendText(
  s: AppSettings,
  toE164: string,
  text: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await evoFetch(s, `/message/sendText/${s.evolutionInstance}`, {
      method: "POST",
      body: JSON.stringify({ number: toE164.replace(/^\+/, ""), text }),
    });
    if (!res.ok) {
      const d = res.data as { response?: { message?: unknown }; message?: unknown } | null;
      const msg = JSON.stringify(d?.response?.message ?? d?.message ?? res.status);
      return { success: false, error: `Evolution API: ${msg}` };
    }
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? `Evolution API: ${e.message}` : "Evolution API inacessível",
    };
  }
}
