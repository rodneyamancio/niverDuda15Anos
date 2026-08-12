"use client";

import { useState } from "react";

type Status = "PENDING" | "YES" | "NO";

export default function ResponseButtons({
  token,
  initialStatus,
  primaryColor,
}: {
  token: string;
  initialStatus: Status;
  primaryColor: string;
}) {
  const [status, setStatus] = useState<Status>(initialStatus);
  const [loading, setLoading] = useState<"YES" | "NO" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);

  async function respond(attending: boolean) {
    setLoading(attending ? "YES" : "NO");
    setError(null);
    try {
      const res = await fetch(`/api/invite/${token}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attending }),
      });
      if (!res.ok) throw new Error();
      setStatus(attending ? "YES" : "NO");
      setChanging(false);
    } catch {
      setError("Não foi possível salvar sua resposta. Tente novamente.");
    } finally {
      setLoading(null);
    }
  }

  if (status !== "PENDING" && !changing) {
    return (
      <div className="mt-8">
        {status === "YES" ? (
          <div className="bg-royal-100 border border-royal-200 rounded-2xl px-6 py-5">
            <p className="text-2xl">🎉</p>
            <p className="text-royal-700 font-semibold mt-1">Que alegria! Sua presença está anotada.</p>
            <p className="text-sm text-royal-800/60 mt-1">
              Em breve enviaremos o convite oficial com todos os detalhes.
            </p>
          </div>
        ) : (
          <div className="bg-royal-50 border border-royal-100 rounded-2xl px-6 py-5">
            <p className="text-2xl">😢</p>
            <p className="text-royal-700 font-semibold mt-1">Que pena que você não poderá ir!</p>
            <p className="text-sm text-royal-800/60 mt-1">
              Sentiremos sua falta. Se mudar de ideia, é só responder de novo.
            </p>
          </div>
        )}
        <button
          onClick={() => setChanging(true)}
          className="mt-4 text-sm text-royal-500 underline underline-offset-4 hover:text-royal-700"
        >
          Mudar minha resposta
        </button>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <p className="text-sm font-medium text-royal-800/70 mb-4">Você pretende ir?</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={() => respond(true)}
          disabled={loading !== null}
          style={{ backgroundColor: primaryColor }}
          className="flex-1 sm:flex-none sm:min-w-44 hover:opacity-90 disabled:opacity-60 text-white rounded-full px-8 py-3.5 font-semibold transition-opacity"
        >
          {loading === "YES" ? "Salvando..." : "Sim, pretendo ir! 🎉"}
        </button>
        <button
          onClick={() => respond(false)}
          disabled={loading !== null}
          className="flex-1 sm:flex-none sm:min-w-44 bg-white border-2 border-royal-200 hover:border-royal-400 disabled:opacity-60 text-royal-700 rounded-full px-8 py-3.5 font-semibold transition-colors"
        >
          {loading === "NO" ? "Salvando..." : "Não poderei ir 😢"}
        </button>
      </div>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </div>
  );
}
