import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { ModulePlaceholder } from "@/features/placeholder/module-placeholder";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <ModulePlaceholder
      title="Notifications"
      description="Low stock, near expiry, supplier dues and pending payments, in realtime."
      icon={Bell}
      phase="7"
      capabilities={[
        "Low stock alerts",
        "Expiry alerts",
        "Supplier dues",
        "Pending payments",
        "Daily summary",
        "Realtime",
      ]}
    />
  );
}
