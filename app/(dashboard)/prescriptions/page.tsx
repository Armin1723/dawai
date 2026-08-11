import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { ModulePlaceholder } from "@/features/placeholder/module-placeholder";

export const metadata: Metadata = { title: "Prescriptions" };

export default function PrescriptionsPage() {
  return (
    <ModulePlaceholder
      title="Prescriptions"
      description="Upload, match and manage prescriptions with refill reminders."
      icon={FileText}
      phase="6"
      capabilities={[
        "Prescription upload",
        "OCR (future)",
        "Medicine matching",
        "Doctor details",
        "Validity tracking",
        "Refill reminders",
      ]}
    />
  );
}
