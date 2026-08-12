"use client";

import { useCallback, useEffect, useState } from "react";

type Notifier = {
  id: string;
  name: string;
  phone: string;
  active: boolean;
};

const inputCls =
  "w-full border border-royal-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-royal-400";

export default function NotifiersManager({
  onFeedback,
}: {
  onFeedback: (kind: "ok" | "err", text: string) => void;
}) {
  const [notifiers, setNotifiers] = useState<Notifier[]>([]);
  const [form, setForm] = useState({ name: "", phone: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/notifiers");
    const data = await res.json();
    setNotifiers(data.notifiers ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/notifiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Erro ao cadastrar");
      onFeedback("ok", `"${form.name}" passará a receber os avisos no WhatsApp!`);
      setForm({ name: "", phone: "" });
      await load();
    } catch (err) {
      onFeedback("err", err instanceof Error ? err.message : "Erro ao cadastrar");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(n: Notifier) {
    const res = await fetch(`/api/notifiers/${n.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !n.active }),
    });
    if (res.ok) {
      onFeedback("ok", `Avisos ${!n.active ? "reativados" : "pausados"} para ${n.name}.`);
      await load();
    } else {
      onFeedback("err", "Erro ao atualizar destinatário.");
    }
  }

  async function remove(n: Notifier) {
    if (!confirm(`Remover ${n.name} dos avisos de resposta?`)) return;
    const res = await fetch(`/api/notifiers/${n.id}`, { method: "DELETE" });
    if (res.ok) {
      onFeedback("ok", "Destinatário removido.");
      await load();
    } else {
      onFeedback("err", "Erro ao remover destinatário.");
    }
  }

  return (
    <section className="bg-white rounded-2xl border border-royal-100 shadow-sm p-6">
      <h2 className="font-semibold text-royal-700 mb-1">Avisos de resposta no WhatsApp</h2>
      <p className="text-xs text-royal-800/50 mb-4">
        Quem estiver nesta lista recebe uma mensagem no WhatsApp toda vez que um convidado
        responder que pretende ir ou não — com o placar atualizado. Usa as credenciais Twilio
        configuradas acima.
      </p>

      <form onSubmit={add} className="flex flex-wrap gap-3 mb-4">
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className={`${inputCls} flex-1 min-w-40`}
          placeholder="Nome (ex: Rodney)"
          required
        />
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className={`${inputCls} flex-1 min-w-40`}
          placeholder="Celular com DDD (ex: 11 99999-8888)"
          required
        />
        <button
          type="submit"
          disabled={busy}
          className="bg-royal-600 hover:bg-royal-700 text-white rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-60"
        >
          {busy ? "Salvando..." : "+ Adicionar"}
        </button>
      </form>

      {notifiers.length === 0 ? (
        <p className="text-sm text-royal-800/40">Ninguém cadastrado ainda.</p>
      ) : (
        <div className="space-y-2">
          {notifiers.map((n) => (
            <div
              key={n.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-royal-100 px-4 py-3"
            >
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  n.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                }`}
              >
                {n.active ? "Ativo" : "Pausado"}
              </span>
              <div className="flex-1 min-w-40">
                <p className="text-sm font-semibold text-royal-800">{n.name}</p>
                <p className="text-xs text-royal-800/50">📱 {n.phone}</p>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => toggle(n)}
                  className="border border-royal-200 hover:border-royal-400 rounded-full px-3 py-1.5 text-xs"
                >
                  {n.active ? "Pausar" : "Reativar"}
                </button>
                <button
                  type="button"
                  onClick={() => remove(n)}
                  className="border border-rose-200 hover:border-rose-400 text-rose-600 rounded-full px-3 py-1.5 text-xs"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
