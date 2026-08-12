"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import AdminNav from "../nav";

type AuditLog = {
  id: string;
  actor: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  summary: string;
  before: unknown;
  after: unknown;
  metadata: unknown;
  ip: string | null;
  userAgent: string | null;
  method: string | null;
  path: string | null;
  createdAt: string;
};

const ACTION_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: "Login efetuado",
  LOGIN_FAILED: "Login falhou",
  LOGOUT: "Logout",
  GUEST_CREATED: "Convidado cadastrado",
  GUEST_UPDATED: "Convidado editado",
  GUEST_DELETED: "Convidado removido",
  INVITE_SENT: "Convite enviado",
  INVITE_SEND_FAILED: "Falha no envio",
  GUEST_RESPONDED: "Convidado respondeu",
  SETTINGS_UPDATED: "Configurações alteradas",
  PHASE_CREATED: "Fase cadastrada",
  PHASE_UPDATED: "Fase editada",
  PHASE_ACTIVATED: "Fase ativada",
  PHASE_DELETED: "Fase removida",
  NOTIFIER_CREATED: "Destinatário cadastrado",
  NOTIFIER_UPDATED: "Destinatário editado",
  NOTIFIER_DELETED: "Destinatário removido",
  NOTIFICATION_SENT: "Notificação enviada",
  NOTIFICATION_FAILED: "Falha na notificação",
  PASSWORD_CHANGED: "Senha alterada",
};

const ACTION_COLORS: Record<string, string> = {
  LOGIN_SUCCESS: "bg-emerald-100 text-emerald-800",
  LOGIN_FAILED: "bg-rose-100 text-rose-800",
  LOGOUT: "bg-slate-100 text-slate-700",
  GUEST_CREATED: "bg-royal-100 text-royal-700",
  GUEST_UPDATED: "bg-amber-100 text-amber-800",
  GUEST_DELETED: "bg-rose-100 text-rose-800",
  INVITE_SENT: "bg-emerald-100 text-emerald-800",
  INVITE_SEND_FAILED: "bg-rose-100 text-rose-800",
  GUEST_RESPONDED: "bg-sky-100 text-sky-800",
  SETTINGS_UPDATED: "bg-violet-100 text-violet-800",
  PHASE_CREATED: "bg-violet-100 text-violet-800",
  PHASE_UPDATED: "bg-violet-100 text-violet-800",
  PHASE_ACTIVATED: "bg-violet-100 text-violet-800",
  PHASE_DELETED: "bg-rose-100 text-rose-800",
  NOTIFIER_CREATED: "bg-sky-100 text-sky-800",
  NOTIFIER_UPDATED: "bg-sky-100 text-sky-800",
  NOTIFIER_DELETED: "bg-rose-100 text-rose-800",
  NOTIFICATION_SENT: "bg-emerald-100 text-emerald-800",
  NOTIFICATION_FAILED: "bg-rose-100 text-rose-800",
  PASSWORD_CHANGED: "bg-violet-100 text-violet-800",
};

function actorLabel(actor: string): string {
  if (actor === "superadmin") return "Super admin";
  if (actor === "admin") return "Admin";
  if (actor === "system") return "Sistema";
  if (actor.startsWith("guest:")) return `Convidado: ${actor.slice(6)}`;
  return "Desconhecido";
}

function DetailBlock({ title, data }: { title: string; data: unknown }) {
  if (data === null || data === undefined) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-royal-800/60 mb-1">{title}</p>
      <pre className="text-xs bg-royal-50 border border-royal-100 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

export default function AuditTable({
  phaseName,
  eventName,
}: {
  phaseName: string;
  eventName: string;
}) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (action) params.set("action", action);
    if (q.trim()) params.set("q", q.trim());
    const res = await fetch(`/api/audit?${params}`);
    const data = await res.json();
    setLogs(data.logs ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [page, action, q]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / 50));

  return (
    <main className="min-h-screen px-4 py-8 max-w-6xl mx-auto">
      <AdminNav role="superadmin" phaseName={phaseName} eventName={eventName} />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={action}
          onChange={(e) => {
            setPage(1);
            setAction(e.target.value);
          }}
          className="border border-royal-200 rounded-full px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-royal-400"
        >
          <option value="">Todas as ações</option>
          {Object.entries(ACTION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          type="search"
          placeholder="Buscar por texto, ator ou IP..."
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          className="flex-1 min-w-52 border border-royal-200 rounded-full px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-royal-400"
        />
        <button
          onClick={load}
          className="border border-royal-300 hover:border-royal-500 text-royal-700 rounded-full px-4 py-2.5 text-sm font-semibold"
        >
          ↻ Atualizar
        </button>
        <span className="text-sm text-royal-800/50 ml-auto">{total} evento(s)</span>
      </div>

      <section className="bg-white rounded-2xl border border-royal-100 shadow-sm overflow-x-auto">
        {loading ? (
          <p className="p-8 text-center text-royal-800/50">Carregando auditoria...</p>
        ) : logs.length === 0 ? (
          <p className="p-8 text-center text-royal-800/50">Nenhum evento registrado ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-royal-800/60 border-b border-royal-100">
                <th className="px-4 py-3 font-medium whitespace-nowrap">Quando</th>
                <th className="px-4 py-3 font-medium">Ação</th>
                <th className="px-4 py-3 font-medium">Quem</th>
                <th className="px-4 py-3 font-medium">O que aconteceu</th>
                <th className="px-4 py-3 font-medium">IP</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <Fragment key={log.id}>
                  <tr
                    className="border-b border-royal-50 hover:bg-royal-50/50 cursor-pointer"
                    onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                  >
                    <td className="px-4 py-3 text-royal-800/60 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${
                          ACTION_COLORS[log.action] ?? "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-royal-800/80 whitespace-nowrap">
                      {actorLabel(log.actor)}
                    </td>
                    <td className="px-4 py-3 text-royal-800">{log.summary}</td>
                    <td className="px-4 py-3 text-royal-800/60 whitespace-nowrap">
                      {log.ip ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-royal-400 text-xs">
                      {expanded === log.id ? "▲" : "▼"}
                    </td>
                  </tr>
                  {expanded === log.id && (
                    <tr className="border-b border-royal-100 bg-royal-50/30">
                      <td colSpan={6} className="px-6 py-4">
                        <div className="grid md:grid-cols-2 gap-4 mb-3">
                          <DetailBlock title="Antes" data={log.before} />
                          <DetailBlock title="Depois" data={log.after} />
                        </div>
                        <DetailBlock title="Informações extras" data={log.metadata} />
                        <div className="mt-3 grid gap-1 text-xs text-royal-800/60">
                          {log.method && log.path && (
                            <p>
                              <strong>Requisição:</strong> {log.method} {log.path}
                            </p>
                          )}
                          {log.entity && (
                            <p>
                              <strong>Entidade:</strong> {log.entity}
                              {log.entityId ? ` (${log.entityId})` : ""}
                            </p>
                          )}
                          {log.userAgent && (
                            <p className="break-all">
                              <strong>Navegador/dispositivo:</strong> {log.userAgent}
                            </p>
                          )}
                          <p>
                            <strong>ID do evento:</strong> {log.id}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="border border-royal-200 rounded-full px-4 py-1.5 text-sm disabled:opacity-40"
          >
            ← Anterior
          </button>
          <span className="text-sm text-royal-800/60">
            Página {page} de {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="border border-royal-200 rounded-full px-4 py-1.5 text-sm disabled:opacity-40"
          >
            Próxima →
          </button>
        </div>
      )}
    </main>
  );
}
