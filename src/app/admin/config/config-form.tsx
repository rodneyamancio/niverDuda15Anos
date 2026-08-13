"use client";

import { useEffect, useState } from "react";
import AdminNav from "../nav";
import PhasesManager from "./phases-manager";
import NotifiersManager from "./notifiers-manager";

type Settings = {
  eventName: string;
  eventDate: string;
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
  whatsappProvider: string;
  evolutionApiUrl: string;
  evolutionApiKey: string;
  evolutionInstance: string;
};

function isoToLocalInput(iso: string): string {
  // "2026-12-12T20:00:00-03:00" -> "2026-12-12T20:00" (hora local do evento)
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  return m ? `${m[1]}T${m[2]}` : "";
}

function localInputToIso(local: string): string {
  // "2026-12-12T20:00" -> "2026-12-12T20:00:00-03:00" (horário de Brasília)
  return local ? `${local}:00-03:00` : "";
}

const inputCls =
  "w-full border border-royal-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-royal-400";
const labelCls = "block text-sm text-royal-800/70 mb-1";

const STATE_LABEL: Record<string, { text: string; cls: string }> = {
  open: { text: "✅ Conectado", cls: "bg-emerald-100 text-emerald-800" },
  connecting: { text: "🔄 Aguardando leitura do QR", cls: "bg-amber-100 text-amber-800" },
  close: { text: "⚪ Desconectado", cls: "bg-slate-100 text-slate-700" },
  unconfigured: { text: "⚙️ Configure e salve primeiro", cls: "bg-amber-100 text-amber-800" },
  unreachable: { text: "❌ Evolution API fora do ar", cls: "bg-rose-100 text-rose-800" },
  unknown: { text: "— Estado desconhecido", cls: "bg-slate-100 text-slate-700" },
};

function WhatsappConnect() {
  const [state, setState] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshStatus() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/whatsapp");
      const data = await res.json();
      setState(data.state ?? "unknown");
      if (data.state === "open") setQr(null);
    } catch {
      setState("unreachable");
    } finally {
      setBusy(false);
    }
  }

  async function generateQr() {
    setBusy(true);
    setError(null);
    setQr(null);
    try {
      const res = await fetch("/api/whatsapp", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Erro ao gerar QR");
      setState(data.state ?? "unknown");
      setQr(data.qrBase64 ?? null);
      if (data.state === "open") setError(null);
      else if (!data.qrBase64) setError("QR não retornado — tente de novo em alguns segundos.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao gerar QR");
    } finally {
      setBusy(false);
    }
  }

  const badge = state ? (STATE_LABEL[state] ?? STATE_LABEL.unknown) : null;

  return (
    <div className="mt-5 rounded-xl border border-royal-200 bg-royal-50/50 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm font-semibold text-royal-700">Conexão do número</p>
        {badge && (
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge.cls}`}>
            {badge.text}
          </span>
        )}
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={refreshStatus}
            disabled={busy}
            className="border border-royal-300 hover:border-royal-500 text-royal-700 rounded-full px-4 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            Ver status
          </button>
          <button
            type="button"
            onClick={generateQr}
            disabled={busy}
            className="bg-royal-600 hover:bg-royal-700 text-white rounded-full px-4 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            {busy ? "Aguarde..." : "Gerar QR code"}
          </button>
        </div>
      </div>
      <p className="text-xs text-royal-800/50 mt-2">
        Salve as configurações acima antes de conectar. Depois, gere o QR e escaneie no celular do
        número que vai enviar as mensagens: WhatsApp → Configurações → Dispositivos conectados →
        Conectar dispositivo. Prefira um número secundário.
      </p>
      {error && <p className="text-xs text-rose-700 mt-2">{error}</p>}
      {qr && (
        <div className="mt-3 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR code de conexão do WhatsApp" className="w-56 h-56 rounded-lg border border-royal-200 bg-white p-2" />
        </div>
      )}
    </div>
  );
}

export default function ConfigForm({
  phaseName,
  eventName,
}: {
  phaseName: string;
  eventName: string;
}) {
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setS(d.settings));
  }, []);

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setS((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!s) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Erro ao salvar");
      if (data.settings) setS(data.settings);
      setFeedback({
        kind: "ok",
        text: data.changed?.length
          ? `Configurações salvas (${data.changed.length} campo(s) alterado(s)).`
          : "Nada para salvar — nenhuma alteração detectada.",
      });
    } catch (err) {
      setFeedback({ kind: "err", text: err instanceof Error ? err.message : "Erro ao salvar" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 max-w-4xl mx-auto">
      <AdminNav role="superadmin" phaseName={phaseName} eventName={eventName} />

      {!s ? (
        <p className="text-royal-800/50 text-center py-12">Carregando configurações...</p>
      ) : (
        <div className="space-y-6">
          {feedback && (
            <div
              className={`rounded-xl px-4 py-3 text-sm ${
                feedback.kind === "ok"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              {feedback.text}
            </div>
          )}

          <form onSubmit={save} className="space-y-6">
          {/* Dados da festa */}
          <section className="bg-white rounded-2xl border border-royal-100 shadow-sm p-6">
            <h2 className="font-semibold text-royal-700 mb-4">Dados da festa</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Nome do evento</label>
                <input
                  value={s.eventName}
                  onChange={(e) => set("eventName", e.target.value)}
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Data e hora (horário de Brasília)</label>
                <input
                  type="datetime-local"
                  value={isoToLocalInput(s.eventDate)}
                  onChange={(e) => set("eventDate", localInputToIso(e.target.value))}
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Local</label>
                <input
                  value={s.eventVenue}
                  onChange={(e) => set("eventVenue", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Cidade</label>
                <input
                  value={s.eventCity}
                  onChange={(e) => set("eventCity", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>URL pública do site (usada nos links enviados)</label>
                <input
                  type="url"
                  value={s.appUrl}
                  onChange={(e) => set("appUrl", e.target.value)}
                  className={inputCls}
                  required
                />
              </div>
            </div>
          </section>

          {/* Cores */}
          <section className="bg-white rounded-2xl border border-royal-100 shadow-sm p-6">
            <h2 className="font-semibold text-royal-700 mb-1">Cores do convite</h2>
            <p className="text-xs text-royal-800/50 mb-4">
              Aplicadas na página do convite e no e-mail enviado aos convidados.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {(
                [
                  ["primaryColor", "Cor principal"],
                  ["secondaryColor", "Cor secundária"],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <label className={labelCls}>{label}</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={s[key]}
                      onChange={(e) => set(key, e.target.value)}
                      className="h-10 w-14 rounded-lg border border-royal-200 cursor-pointer"
                    />
                    <input
                      value={s[key]}
                      onChange={(e) => set(key, e.target.value)}
                      className={inputCls}
                      pattern="^#[0-9a-fA-F]{6}$"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div
              className="mt-4 rounded-xl p-5 text-center text-white"
              style={{ background: `linear-gradient(135deg, ${s.primaryColor}, ${s.secondaryColor})` }}
            >
              <p className="text-xs tracking-[0.3em] uppercase opacity-80">Save the Date</p>
              <p className="[font-family:var(--font-display)] text-xl mt-1">{s.eventName}</p>
            </div>
          </section>

          {/* Resend */}
          <section className="bg-white rounded-2xl border border-royal-100 shadow-sm p-6">
            <h2 className="font-semibold text-royal-700 mb-1">E-mail (Resend)</h2>
            <p className="text-xs text-royal-800/50 mb-4">
              Segredos aparecem mascarados (••••). Para trocar, digite o valor novo por cima; para
              manter, não mexa no campo.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>API Key do Resend</label>
                <input
                  value={s.resendApiKey}
                  onChange={(e) => set("resendApiKey", e.target.value)}
                  className={inputCls}
                  placeholder="re_..."
                  autoComplete="off"
                />
              </div>
              <div>
                <label className={labelCls}>Remetente (From)</label>
                <input
                  value={s.emailFrom}
                  onChange={(e) => set("emailFrom", e.target.value)}
                  className={inputCls}
                  placeholder="Festa da Duda <convite@dominio.com>"
                />
              </div>
            </div>
          </section>

          {/* WhatsApp */}
          <section className="bg-white rounded-2xl border border-royal-100 shadow-sm p-6">
            <h2 className="font-semibold text-royal-700 mb-1">WhatsApp</h2>
            <p className="text-xs text-royal-800/50 mb-4">
              Usado nos convites e nos avisos de resposta. Segredos aparecem mascarados (••••) —
              para trocar, digite por cima.
            </p>

            <div className="grid grid-cols-2 gap-2 mb-5 max-w-md">
              {(
                [
                  ["evolution", "Evolution API (QR code)"],
                  ["twilio", "Twilio"],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className={`flex items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-semibold cursor-pointer ${
                    s.whatsappProvider === value
                      ? "border-royal-500 bg-royal-50 text-royal-700"
                      : "border-royal-200 text-royal-800/60"
                  }`}
                >
                  <input
                    type="radio"
                    name="whatsappProvider"
                    className="hidden"
                    checked={s.whatsappProvider === value}
                    onChange={() => set("whatsappProvider", value)}
                  />
                  {label}
                </label>
              ))}
            </div>

            {s.whatsappProvider === "evolution" ? (
              <>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>URL do Evolution API</label>
                    <input
                      value={s.evolutionApiUrl}
                      onChange={(e) => set("evolutionApiUrl", e.target.value)}
                      className={inputCls}
                      placeholder="http://evolution:8080"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>API Key (AUTHENTICATION_API_KEY)</label>
                    <input
                      value={s.evolutionApiKey}
                      onChange={(e) => set("evolutionApiKey", e.target.value)}
                      className={inputCls}
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Nome da instância</label>
                    <input
                      value={s.evolutionInstance}
                      onChange={(e) => set("evolutionInstance", e.target.value)}
                      className={inputCls}
                      placeholder="festa-duda"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>DDI padrão</label>
                    <input
                      value={s.defaultCountryCode}
                      onChange={(e) => set("defaultCountryCode", e.target.value)}
                      className={inputCls}
                      placeholder="55"
                    />
                  </div>
                </div>
                <WhatsappConnect />
              </>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Account SID</label>
                  <input
                    value={s.twilioAccountSid}
                    onChange={(e) => set("twilioAccountSid", e.target.value)}
                    className={inputCls}
                    placeholder="AC..."
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className={labelCls}>Auth Token</label>
                  <input
                    value={s.twilioAuthToken}
                    onChange={(e) => set("twilioAuthToken", e.target.value)}
                    className={inputCls}
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className={labelCls}>Número WhatsApp remetente</label>
                  <input
                    value={s.twilioWhatsappFrom}
                    onChange={(e) => set("twilioWhatsappFrom", e.target.value)}
                    className={inputCls}
                    placeholder="+14155238886"
                  />
                </div>
                <div>
                  <label className={labelCls}>DDI padrão</label>
                  <input
                    value={s.defaultCountryCode}
                    onChange={(e) => set("defaultCountryCode", e.target.value)}
                    className={inputCls}
                    placeholder="55"
                  />
                </div>
              </div>
            )}
          </section>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-royal-600 hover:bg-royal-700 text-white rounded-full px-8 py-3 font-semibold disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar configurações"}
            </button>
          </div>
          </form>

          <PhasesManager onFeedback={(kind, text) => setFeedback({ kind, text })} />
          <NotifiersManager onFeedback={(kind, text) => setFeedback({ kind, text })} />
        </div>
      )}
    </main>
  );
}
