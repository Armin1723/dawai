import type { Metadata } from "next";
import { Settings as SettingsIcon } from "lucide-react";
import { ModulePlaceholder } from "@/features/placeholder/module-placeholder";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <ModulePlaceholder
      title="Settings"
      description="Business details, GST, invoices, theme, printer, taxes, users and backups."
      icon={SettingsIcon}
      phase="7"
      capabilities={[
        "Business details",
        "GST & taxes",
        "Invoice settings",
        "Printer",
        "Users & permissions",
        "Backups",
        "AI preferences",
      ]}
    />
  );
}
