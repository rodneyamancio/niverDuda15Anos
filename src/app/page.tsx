import Link from "next/link";
import { getSettings, formatEventDate } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function Home() {
  const s = await getSettings();
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <p
        className="text-sm tracking-[0.35em] uppercase mb-4"
        style={{ color: s.secondaryColor }}
      >
        Save the Date
      </p>
      <h1
        className="[font-family:var(--font-display)] text-5xl md:text-6xl mb-4"
        style={{ color: s.primaryColor }}
      >
        {s.eventName}
      </h1>
      <p className="text-lg text-royal-800/70 capitalize mb-10">{formatEventDate(s.eventDate)}</p>
      <p className="text-sm text-royal-800/50 max-w-md">
        Este é o portal da festa. Os convidados recebem um link exclusivo por e-mail ou WhatsApp
        para responder ao convite.
      </p>
      <Link
        href="/admin"
        className="mt-10 text-sm text-royal-500 underline underline-offset-4 hover:text-royal-700"
      >
        Área dos organizadores
      </Link>
    </main>
  );
}
