import { redirect } from "next/navigation";
import { getRole } from "@/lib/auth";
import { getSettings, getActivePhase } from "@/lib/settings";
import PasswordForm from "./password-form";

export const dynamic = "force-dynamic";

export default async function PasswordPage() {
  const role = await getRole();
  if (!role) redirect("/admin/login");
  const [settings, phase] = await Promise.all([getSettings(), getActivePhase()]);
  return <PasswordForm role={role} phaseName={phase.name} eventName={settings.eventName} />;
}
