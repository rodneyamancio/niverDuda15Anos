import { redirect } from "next/navigation";
import { getRole } from "@/lib/auth";
import { getSettings, getPhases } from "@/lib/settings";
import Dashboard from "./dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const role = await getRole();
  if (!role) redirect("/admin/login");
  const [settings, phases] = await Promise.all([getSettings(), getPhases()]);

  const active = phases.find((p) => p.status === "ACTIVE") ?? null;
  const next = phases.filter((p) => p.status === "PLANNED").sort((a, b) => a.order - b.order)[0] ?? null;

  return (
    <Dashboard
      role={role}
      eventName={settings.eventName}
      activePhase={
        active
          ? { name: active.name, description: active.description, endsAt: active.endsAt?.toISOString() ?? null }
          : { name: "Save the Date", description: null, endsAt: null }
      }
      nextPhase={
        next
          ? { name: next.name, description: next.description, endsAt: next.endsAt?.toISOString() ?? null }
          : null
      }
    />
  );
}
