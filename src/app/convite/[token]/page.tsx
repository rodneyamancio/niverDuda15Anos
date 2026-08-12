import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSettings, formatEventDate, formatEventTime } from "@/lib/settings";
import ResponseButtons from "./response-buttons";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const [guest, s] = await Promise.all([
    prisma.guest.findUnique({ where: { token } }),
    getSettings(),
  ]);
  if (!guest) notFound();

  const firstName = guest.name.split(" ")[0];

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: `linear-gradient(180deg, ${s.secondaryColor}22, #faf7ff 40%)` }}
    >
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          <div
            className="px-8 py-12 text-center"
            style={{ background: `linear-gradient(135deg, ${s.primaryColor}, ${s.secondaryColor})` }}
          >
            <p className="text-white/70 text-xs tracking-[0.4em] uppercase">Save the Date</p>
            <h1 className="[font-family:var(--font-display)] text-4xl md:text-5xl text-white mt-4">
              {s.eventName}
            </h1>
            <div className="mt-6 inline-block border-t border-b border-white/30 py-3 px-6">
              <p className="text-white text-lg capitalize">{formatEventDate(s.eventDate)}</p>
              <p className="text-white/80 text-sm mt-1">
                às {formatEventTime(s.eventDate)} · {s.eventVenue}
                {s.eventCity ? ` — ${s.eventCity}` : ""}
              </p>
            </div>
          </div>

          <div className="px-8 py-10 text-center">
            <p className="text-xl text-royal-800">
              Olá, <span className="font-semibold">{firstName}</span>! 💜
            </p>
            <p className="mt-3 text-royal-800/70 leading-relaxed">
              Você é um convidado muito especial. Reserve essa data — o convite oficial com todos
              os detalhes chega em breve!
            </p>

            <ResponseButtons
              token={token}
              initialStatus={guest.saveTheDate}
              primaryColor={s.primaryColor}
            />
          </div>
        </div>

        <p className="text-center text-xs text-royal-800/40 mt-6">
          Convite pessoal e intransferível de {guest.name}
        </p>
      </div>
    </main>
  );
}
