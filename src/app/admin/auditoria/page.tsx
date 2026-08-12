import { redirect } from "next/navigation";
import { getRole } from "@/lib/auth";
import { getSettings, getActivePhase } from "@/lib/settings";
import AuditTable from "./audit-table";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const role = await getRole();
  if (!role) redirect("/admin/login");
  if (role !== "superadmin") redirect("/admin");
  const [settings, phase] = await Promise.all([getSettings(), getActivePhase()]);
  return <AuditTable phaseName={phase.name} eventName={settings.eventName} />;
}
