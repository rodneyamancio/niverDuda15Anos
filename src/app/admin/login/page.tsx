"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Erro ao entrar");
      }
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-white rounded-2xl shadow-lg shadow-royal-500/10 p-8"
      >
        <h1 className="[font-family:var(--font-display)] text-2xl text-royal-700 text-center">
          Painel dos organizadores
        </h1>
        <p className="text-sm text-royal-800/60 text-center mt-1 mb-6">15 Anos da Duda 💜</p>

        <label className="block text-sm font-medium text-royal-800 mb-1" htmlFor="password">
          Senha
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-royal-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-royal-400"
          autoFocus
          required
        />

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full bg-royal-600 hover:bg-royal-700 disabled:opacity-60 text-white rounded-lg py-2.5 font-semibold transition-colors"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
