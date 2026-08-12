"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function AdminNav({
  role,
  phaseName,
  eventName,
}: {
  role: "admin" | "superadmin";
  phaseName: string;
  eventName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  }

  const links = [
    { href: "/admin", label: "Convidados" },
    ...(role === "superadmin"
      ? [
          { href: "/admin/config", label: "Configurações" },
          { href: "/admin/auditoria", label: "Auditoria" },
        ]
      : []),
    { href: "/admin/senha", label: "Senha" },
  ];

  return (
    <header className="mb-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="[font-family:var(--font-display)] text-3xl text-royal-700">{eventName}</h1>
          <p className="text-sm text-royal-800/60">
            Painel dos organizadores
            {role === "superadmin" && (
              <span className="ml-2 inline-block rounded-full bg-royal-700 text-white text-[11px] px-2 py-0.5 align-middle">
                super admin
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="inline-flex items-center gap-1.5 rounded-full bg-royal-100 border border-royal-200 text-royal-700 text-xs font-semibold px-3 py-1.5"
            title="Fase atual do evento"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Fase: {phaseName}
          </span>
          <button
            onClick={logout}
            className="text-sm text-royal-500 underline underline-offset-4 hover:text-royal-700"
          >
            Sair
          </button>
        </div>
      </div>

      <nav className="mt-5 flex gap-1 border-b border-royal-100">
        {links.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 -mb-px transition-colors ${
                active
                  ? "border-royal-600 text-royal-700 bg-royal-50"
                  : "border-transparent text-royal-800/50 hover:text-royal-700"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
