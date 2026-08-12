"use client";

import { useCallback, useEffect, useState } from "react";

type Phase = {
  id: string;
  name: string;
  description: string | null;
  endsAt: string | null;
  status: "PLANNED" | "ACTIVE" | "CLOSED";
  order: number;
};

const STATUS_BADGE: Record<Phase["status"], { text: string; cls: string }> = {
  ACTIVE: { text: "Ativa", cls: "bg-emerald-100 text-emerald-800" },
  PLANNED: { text: "Planejada", cls: "bg-amber-100 text-amber-800" },
  CLOSED: { text: "Encerrada", cls: "bg-slate-100 text-slate-600" },
};

const inputCls =
  "w-full border border-royal-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-royal-400";

function isoToDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

export default function PhasesManager({
  onFeedback,
}: {
  onFeedback: (kind: "ok" | "err", text: string) => void;
}) {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [form, setForm] = useState<{ id?: string; name: string; description: string; endsAt: string }>({
    name: "",
    description: "",
    endsAt: "",
  });
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/phases");
    const data = await res.json();
    setPhases(data.phases ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const isEdit = Boolean(form.id);
      const res = await fetch(isEdit ? `/api/phases/${form.id}` : "/api/phases", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          endsAt: form.endsAt ? `${form.endsAt}T23:59:00-03:00` : "",
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Erro ao salvar fase");
      onFeedback("ok", isEdit ? "Fase atualizada!" : "Fase cadastrada!");
      setForm({ name: "", description: "", endsAt: "" });
      setFormOpen(false);
      await load();
    } catch (err) {
      onFeedback("err", err instanceof Error ? err.message : "Erro ao salvar fase");
    } finally {
      setBusy(false);
    }
  }

  async function activate(phase: Phase) {
    if (
      !confirm(
        `Ativar a fase "${phase.name}"? A fase atualmente ativa será marcada como encerrada e o painel passará a refletir a nova fase.`
      )
    )
      return;
    setBusy(true);
    const res = await fetch(`/api/phases/${phase.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activate: true }),
    });
    setBusy(false);
    if (res.ok) {
      onFeedback("ok", `Fase "${phase.name}" ativada!`);
      await load();
      window.location.reload();
    } else {
      const data = await res.json().catch(() => null);
      onFeedback("err", data?.error ?? "Erro ao ativar fase");
    }
  }

  async function remove(phase: Phase) {
    if (!confirm(`Remover a fase "${phase.name}"?`)) return;
    const res = await fetch(`/api/phases/${phase.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => null);
    if (res.ok) {
      onFeedback("ok", "Fase removida.");
      await load();
    } else {
      onFeedback("err", data?.error ?? "Erro ao remover fase");
    }
  }

  return (
    <section className="bg-white rounded-2xl border border-royal-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold text-royal-700">Fases do evento</h2>
        <button
          type="button"
          onClick={() => {
            setForm({ name: "", description: "", endsAt: "" });
            setFormOpen(true);
          }}
          className="text-sm border border-royal-300 hover:border-royal-500 text-royal-700 rounded-full px-4 py-1.5 font-semibold"
        >
          + Nova fase
        </button>
      </div>
      <p className="text-xs text-royal-800/50 mb-4">
        Cadastre as próximas fases com a data prevista de encerramento. Só uma fase fica ativa por
        vez — ativar uma nova encerra a anterior.
      </p>

      {formOpen && (
        <form onSubmit={save} className="rounded-xl border border-royal-200 bg-royal-50/50 p-4 mb-4">
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-royal-800/70 mb-1">Nome da fase *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputCls}
                placeholder="Ex: Convite oficial (RSVP)"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-royal-800/70 mb-1">Descrição</label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className={inputCls}
                placeholder="O que acontece nessa fase"
              />
            </div>
            <div>
              <label className="block text-sm text-royal-800/70 mb-1">
                Encerramento previsto
              </label>
              <input
                type="date"
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>
          <div className="flex gap-3 mt-3">
            <button
              type="submit"
              disabled={busy}
              className="bg-royal-600 hover:bg-royal-700 text-white rounded-full px-5 py-1.5 text-sm font-semibold disabled:opacity-60"
            >
              {busy ? "Salvando..." : "Salvar fase"}
            </button>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="text-sm text-royal-500 hover:text-royal-700"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {phases.map((p) => (
          <div
            key={p.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-royal-100 px-4 py-3"
          >
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE[p.status].cls}`}
            >
              {STATUS_BADGE[p.status].text}
            </span>
            <div className="flex-1 min-w-40">
              <p className="text-sm font-semibold text-royal-800">{p.name}</p>
              <p className="text-xs text-royal-800/50">
                {p.description ?? ""}
                {p.endsAt &&
                  ` · encerramento previsto: ${new Date(p.endsAt).toLocaleDateString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                  })}`}
              </p>
            </div>
            <div className="flex gap-1.5">
              {p.status !== "ACTIVE" && (
                <button
                  type="button"
                  onClick={() => activate(p)}
                  disabled={busy}
                  className="border border-emerald-300 hover:border-emerald-500 text-emerald-700 rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                >
                  Ativar
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setForm({
                    id: p.id,
                    name: p.name,
                    description: p.description ?? "",
                    endsAt: isoToDateInput(p.endsAt),
                  });
                  setFormOpen(true);
                }}
                className="border border-royal-200 hover:border-royal-400 rounded-full px-3 py-1.5 text-xs"
              >
                ✏️
              </button>
              {p.status !== "ACTIVE" && (
                <button
                  type="button"
                  onClick={() => remove(p)}
                  className="border border-rose-200 hover:border-rose-400 text-rose-600 rounded-full px-3 py-1.5 text-xs"
                >
                  🗑️
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
