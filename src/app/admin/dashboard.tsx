"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "./nav";

type MessageLog = {
  id: string;
  channel: "EMAIL" | "WHATSAPP";
  success: boolean;
  error: string | null;
  createdAt: string;
};

type Guest = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  token: string;
  saveTheDate: "PENDING" | "YES" | "NO";
  saveTheDateAt: string | null;
  notes: string | null;
  createdAt: string;
  messages: MessageLog[];
};

type FormState = {
  id?: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
};

const emptyForm: FormState = { name: "", email: "", phone: "", notes: "" };

const statusLabel = {
  PENDING: { text: "Aguardando", cls: "bg-amber-100 text-amber-800" },
  YES: { text: "Pretende ir 🎉", cls: "bg-emerald-100 text-emerald-800" },
  NO: { text: "Não pretende ir", cls: "bg-rose-100 text-rose-800" },
} as const;

type PhaseSummary = { name: string; description: string | null; endsAt: string | null };

function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export default function Dashboard({
  role,
  eventName,
  activePhase,
  nextPhase,
}: {
  role: "admin" | "superadmin";
  eventName: string;
  activePhase: PhaseSummary;
  nextPhase: PhaseSummary | null;
}) {
  const router = useRouter();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [bulkSending, setBulkSending] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [search, setSearch] = useState("");

  const notify = useCallback((kind: "ok" | "err", text: string) => {
    setFeedback({ kind, text });
    setTimeout(() => setFeedback(null), 6000);
  }, []);

  const loadGuests = useCallback(async () => {
    const res = await fetch("/api/guests");
    if (res.status === 401) {
      router.push("/admin/login");
      return;
    }
    const data = await res.json();
    setGuests(data.guests ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadGuests();
  }, [loadGuests]);

  const stats = useMemo(() => {
    const total = guests.length;
    const yes = guests.filter((g) => g.saveTheDate === "YES").length;
    const no = guests.filter((g) => g.saveTheDate === "NO").length;
    return { total, yes, no, pending: total - yes - no };
  }, [guests]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return guests;
    return guests.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.email ?? "").toLowerCase().includes(q) ||
        (g.phone ?? "").includes(q)
    );
  }, [guests, search]);

  async function saveGuest(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const isEdit = Boolean(form.id);
      const res = await fetch(isEdit ? `/api/guests/${form.id}` : "/api/guests", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          notes: form.notes,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Erro ao salvar");
      notify("ok", isEdit ? "Convidado atualizado!" : "Convidado cadastrado!");
      setForm(emptyForm);
      setFormOpen(false);
      await loadGuests();
    } catch (err) {
      notify("err", err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function removeGuest(guest: Guest) {
    if (!confirm(`Remover ${guest.name} da lista?`)) return;
    const res = await fetch(`/api/guests/${guest.id}`, { method: "DELETE" });
    if (res.ok) {
      notify("ok", "Convidado removido.");
      await loadGuests();
    } else {
      notify("err", "Erro ao remover convidado.");
    }
  }

  async function sendTo(guest: Guest, channels: ("email" | "whatsapp")[]) {
    setSending(guest.id);
    try {
      const res = await fetch(`/api/guests/${guest.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channels }),
      });
      const data = await res.json().catch(() => null);
      const results: { channel: string; success: boolean; error?: string }[] = data?.results ?? [];
      const ok = results.filter((r) => r.success).map((r) => (r.channel === "email" ? "e-mail" : "WhatsApp"));
      const failed = results.filter((r) => !r.success);
      if (ok.length) notify("ok", `Convite enviado por ${ok.join(" e ")} para ${guest.name}!`);
      if (failed.length && !ok.length) notify("err", failed[0].error ?? "Falha no envio");
      await loadGuests();
    } catch {
      notify("err", "Erro ao enviar convite.");
    } finally {
      setSending(null);
    }
  }

  async function sendBulk() {
    const targets = guests.filter((g) => g.saveTheDate === "PENDING" && (g.email || g.phone));
    if (!targets.length) {
      notify("err", "Nenhum convidado pendente com e-mail ou celular.");
      return;
    }
    if (!confirm(`Enviar convite para ${targets.length} convidado(s) pendente(s)? Cada um receberá por todos os canais disponíveis (e-mail e/ou WhatsApp).`)) return;
    setBulkSending(true);
    let okCount = 0;
    for (const g of targets) {
      const channels: ("email" | "whatsapp")[] = [];
      if (g.email) channels.push("email");
      if (g.phone) channels.push("whatsapp");
      const res = await fetch(`/api/guests/${g.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channels }),
      });
      if (res.ok) okCount++;
    }
    setBulkSending(false);
    notify(okCount ? "ok" : "err", `Envio concluído: ${okCount}/${targets.length} com sucesso.`);
    await loadGuests();
  }

  async function copyLink(guest: Guest) {
    const url = `${window.location.origin}/convite/${guest.token}`;
    await navigator.clipboard.writeText(url);
    notify("ok", `Link de ${guest.name} copiado!`);
  }

  function lastSend(guest: Guest): string | null {
    const last = guest.messages?.find((m) => m.success);
    if (!last) return null;
    const d = new Date(last.createdAt);
    return `${last.channel === "EMAIL" ? "✉️" : "💬"} ${d.toLocaleDateString("pt-BR")}`;
  }

  return (
    <main className="min-h-screen px-4 py-8 max-w-6xl mx-auto">
      <AdminNav role={role} phaseName={activePhase.name} eventName={eventName} />

      <div className="mb-6 rounded-2xl border border-royal-200 bg-white p-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <p className="text-sm font-semibold text-royal-700">
            Fase atual: {activePhase.name}
            {activePhase.description && (
              <span className="font-normal text-royal-800/60"> — {activePhase.description}</span>
            )}
            {fmtDate(activePhase.endsAt) && (
              <span className="font-normal text-royal-800/60">
                {" "}
                · encerramento previsto: {fmtDate(activePhase.endsAt)}
              </span>
            )}
          </p>
        </div>
        {nextPhase && (
          <div className="flex items-center gap-2 opacity-60">
            <span className="w-2.5 h-2.5 rounded-full bg-royal-200" />
            <p className="text-sm text-royal-800/60">
              Próxima fase: {nextPhase.name}
              {fmtDate(nextPhase.endsAt) && ` (prevista até ${fmtDate(nextPhase.endsAt)})`}
            </p>
          </div>
        )}
      </div>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Convidados", value: stats.total, cls: "text-royal-700" },
          { label: "Pretendem ir", value: stats.yes, cls: "text-emerald-600" },
          { label: "Não pretendem ir", value: stats.no, cls: "text-rose-600" },
          { label: "Aguardando", value: stats.pending, cls: "text-amber-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-royal-100 p-5">
            <p className={`text-3xl font-bold ${s.cls}`}>{s.value}</p>
            <p className="text-sm text-royal-800/60 mt-1">{s.label}</p>
          </div>
        ))}
      </section>

      {feedback && (
        <div
          className={`mb-4 rounded-xl px-4 py-3 text-sm ${
            feedback.kind === "ok"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {feedback.text}
        </div>
      )}

      <section className="flex flex-wrap items-center gap-3 mb-4">
        <button
          onClick={() => {
            setForm(emptyForm);
            setFormOpen(true);
          }}
          className="bg-royal-600 hover:bg-royal-700 text-white rounded-full px-5 py-2.5 text-sm font-semibold"
        >
          + Cadastrar convidado
        </button>
        <button
          onClick={sendBulk}
          disabled={bulkSending}
          className="bg-white border border-royal-300 hover:border-royal-500 text-royal-700 rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
        >
          {bulkSending ? "Enviando..." : "📤 Enviar para todos os pendentes"}
        </button>
        <input
          type="search"
          placeholder="Buscar por nome, e-mail ou celular..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ml-auto w-full sm:w-72 border border-royal-200 rounded-full px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-royal-400"
        />
      </section>

      {formOpen && (
        <form
          onSubmit={saveGuest}
          className="bg-white rounded-2xl border border-royal-200 shadow-sm p-6 mb-6"
        >
          <h2 className="font-semibold text-royal-700 mb-4">
            {form.id ? "Editar convidado" : "Novo convidado"}
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-royal-800/70 mb-1">Nome *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full border border-royal-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-royal-400"
              />
            </div>
            <div>
              <label className="block text-sm text-royal-800/70 mb-1">E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-royal-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-royal-400"
              />
            </div>
            <div>
              <label className="block text-sm text-royal-800/70 mb-1">Celular (com DDD)</label>
              <input
                type="tel"
                placeholder="11 99999-8888"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full border border-royal-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-royal-400"
              />
            </div>
            <div>
              <label className="block text-sm text-royal-800/70 mb-1">Observações</label>
              <input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full border border-royal-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-royal-400"
              />
            </div>
          </div>
          <p className="text-xs text-royal-800/50 mt-3">
            * Informe pelo menos e-mail ou celular para poder enviar o convite.
          </p>
          <div className="flex gap-3 mt-4">
            <button
              type="submit"
              disabled={saving}
              className="bg-royal-600 hover:bg-royal-700 text-white rounded-full px-6 py-2 text-sm font-semibold disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setFormOpen(false);
                setForm(emptyForm);
              }}
              className="text-sm text-royal-500 hover:text-royal-700"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <section className="bg-white rounded-2xl border border-royal-100 shadow-sm overflow-x-auto">
        {loading ? (
          <p className="p-8 text-center text-royal-800/50">Carregando convidados...</p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-royal-800/50">
            {guests.length === 0
              ? "Nenhum convidado cadastrado ainda. Comece cadastrando o primeiro! 💜"
              : "Nenhum convidado encontrado para essa busca."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-royal-800/60 border-b border-royal-100">
                <th className="px-4 py-3 font-medium">Convidado</th>
                <th className="px-4 py-3 font-medium">Contato</th>
                <th className="px-4 py-3 font-medium">Save the Date</th>
                <th className="px-4 py-3 font-medium">Último envio</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => (
                <tr key={g.id} className="border-b border-royal-50 hover:bg-royal-50/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-royal-800">{g.name}</p>
                    {g.notes && <p className="text-xs text-royal-800/50">{g.notes}</p>}
                  </td>
                  <td className="px-4 py-3 text-royal-800/70">
                    {g.email && <p>✉️ {g.email}</p>}
                    {g.phone && <p>📱 {g.phone}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusLabel[g.saveTheDate].cls}`}
                    >
                      {statusLabel[g.saveTheDate].text}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-royal-800/60">{lastSend(g) ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5 flex-wrap">
                      {g.email && (
                        <button
                          onClick={() => sendTo(g, ["email"])}
                          disabled={sending === g.id}
                          title="Enviar por e-mail"
                          className="border border-royal-200 hover:border-royal-400 rounded-full px-3 py-1.5 text-xs disabled:opacity-50"
                        >
                          ✉️ E-mail
                        </button>
                      )}
                      {g.phone && (
                        <button
                          onClick={() => sendTo(g, ["whatsapp"])}
                          disabled={sending === g.id}
                          title="Enviar por WhatsApp"
                          className="border border-royal-200 hover:border-royal-400 rounded-full px-3 py-1.5 text-xs disabled:opacity-50"
                        >
                          💬 WhatsApp
                        </button>
                      )}
                      <button
                        onClick={() => copyLink(g)}
                        title="Copiar link do convite"
                        className="border border-royal-200 hover:border-royal-400 rounded-full px-3 py-1.5 text-xs"
                      >
                        🔗
                      </button>
                      <button
                        onClick={() => {
                          setForm({
                            id: g.id,
                            name: g.name,
                            email: g.email ?? "",
                            phone: g.phone ?? "",
                            notes: g.notes ?? "",
                          });
                          setFormOpen(true);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        title="Editar"
                        className="border border-royal-200 hover:border-royal-400 rounded-full px-3 py-1.5 text-xs"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => removeGuest(g)}
                        title="Remover"
                        className="border border-rose-200 hover:border-rose-400 text-rose-600 rounded-full px-3 py-1.5 text-xs"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
