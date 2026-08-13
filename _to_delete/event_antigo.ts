export const event = {
  name: process.env.NEXT_PUBLIC_EVENT_NAME ?? "15 Anos da Duda",
  dateISO: process.env.NEXT_PUBLIC_EVENT_DATE ?? "2026-12-12T20:00:00-03:00",
  venue: process.env.NEXT_PUBLIC_EVENT_VENUE ?? "Local a confirmar",
  city: process.env.NEXT_PUBLIC_EVENT_CITY ?? "",
};

export function eventDate(): Date {
  return new Date(event.dateISO);
}

export function formattedDate(): string {
  return eventDate().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });
}

export function formattedTime(): string {
  return eventDate().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function inviteUrl(token: string): string {
  return `${appUrl()}/convite/${token}`;
}
