import { redirect } from "next/navigation";
import { getRole } from "@/lib/auth";
import { getSettings, getActivePhase } from "@/lib/settings";
import ConfigForm from "./config-form";

export const dynamic = "force-dynamic";

export default async function ConfigPage() {
  const role = await getRole();
  if (!role) redirect("/admin/login");
  if (role !== "superadmin") redirect("/admin");
  const [settings, phase] = await Promise.all([getSettings(), getActivePhase()]);
  return <ConfigForm phaseName={phase.name} eventName={settings.eventName} />;
}
