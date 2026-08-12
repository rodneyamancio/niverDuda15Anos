"use client";

import { useState } from "react";
import AdminNav from "../nav";

const inputCls =
  "w-full border border-royal-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-royal-400";

export default function PasswordForm({
  role,
  phaseName,
  eventName,
}: {
  role: "admin" | "superadmin";
  phaseName: string;
  eventName: string;
}) {
  const [target, setTarget] = useState<"admin" | "superadmin">(
    role === "superadmin" ? "superadmin" : "admin"
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirm) {
      setFeedback({ kind: "err", text: "A confirmação não bate com a nova senha." });
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Erro ao trocar a senha");
      setFeedback({
        kind: "ok",
        text: `Senha do ${target === "superadmin" ? "super admin" : "admin"} alterada com sucesso! Use a nova senha no próximo login.`,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } catch (err) {
      setFeedback({ kind: "err", text: err instanceof Error ? err.message : "Erro ao trocar a senha" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 max-w-6xl mx-auto">
      <AdminNav role={role} phaseName={phaseName} eventName={eventName} />

      <div className="max-w-md mx-auto">
        <form onSubmit={submit} className="bg-white rounded-2xl border border-royal-100 shadow-sm p-6">
          <h2 className="font-semibold text-royal-700 mb-1">Trocar senha</h2>
          <p className="text-xs text-royal-800/50 mb-5">
            {role === "superadmin"
              ? "Como super admin, você pode trocar tanto a sua senha quanto a do admin."
              : "Você pode trocar a senha de acesso do admin."}
          </p>

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

          {role === "superadmin" && (
            <div className="mb-4">
              <label className="block text-sm text-royal-800/70 mb-1">Qual senha trocar?</label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["superadmin", "Super admin"],
                    ["admin", "Admin"],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold cursor-pointer ${
                      target === value
                        ? "border-royal-500 bg-royal-50 text-royal-700"
                        : "border-royal-200 text-royal-800/60"
                    }`}
                  >
                    <input
                      type="radio"
                      name="target"
                      className="hidden"
                      checked={target === value}
                      onChange={() => setTarget(value)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm text-royal-800/70 mb-1">
              Sua senha atual ({role === "superadmin" ? "super admin" : "admin"})
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputCls}
              required
              autoComplete="current-password"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm text-royal-800/70 mb-1">Nova senha (mín. 8 caracteres)</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputCls}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div className="mb-5">
            <label className="block text-sm text-royal-800/70 mb-1">Confirmar nova senha</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputCls}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-royal-600 hover:bg-royal-700 text-white rounded-full py-2.5 font-semibold disabled:opacity-60"
          >
            {busy ? "Salvando..." : "Trocar senha"}
          </button>

          <p className="text-[11px] text-royal-800/40 mt-4">
            A senha é guardada com hash seguro no banco e passa a valer imediatamente. A senha do
            .env fica valendo apenas enquanto nenhuma senha for definida por aqui.
          </p>
        </form>
      </div>
    </main>
  );
}
